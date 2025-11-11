import { z } from "zod";
import { StateGraph, END, START, Command } from "@langchain/langgraph";
import { addPropertyFromUrl } from "./tools/properties";
import { createAppointment } from "./tools/appointments";
import { db } from "@/lib/db";
import { screeningTemplates, properties as propertiesTable } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { leadReply, planLeadStep, extractScreeningAnswers } from "./llm";

export const LeadInputSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string(),
      })
    )
    .optional(),
});

export type LeadInput = z.infer<typeof LeadInputSchema>;

export type LeadResult = {
  ok: boolean;
  reply: string;
  data?: any;
};

type ScreeningField = { id: string; label: string };

const LeadState = z.object({
  userId: z.string(),
  message: z.string(),
  history: z
    .array(
      z.object({ role: z.enum(["user", "assistant"]), text: z.string() })
    )
    .optional(),
  propertyId: z.string().optional(),
  propertyTitle: z.string().optional(),
  propertyUrl: z.string().optional(),
  screeningFields: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
  screeningAnswers: z.record(z.string(), z.string()).optional(),
  screeningComplete: z.boolean().optional(),
  offeredSlots: z.array(z.string()).optional(),
  plan: z.any().optional(),
  data: z.any().optional(),
  reply: z.string().optional(),
});

function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[\w\-._~:\/?#[\]@!$&'()*+,;=%]+/i);
  return m ? m[0] : null;
}

function findLastUrlInHistory(history?: Array<{ role: "user" | "assistant"; text: string }>): string | null {
  if (!history || history.length === 0) return null;
  const urls = history
    .map((h) => extractFirstUrl(h.text))
    .filter((u): u is string => Boolean(u));
  return urls.length ? urls[urls.length - 1] : null;
}

async function getDefaultScreeningFields(userId: string): Promise<ScreeningField[]> {
  try {
    const rows = await db
      .select()
      .from(screeningTemplates)
      .where(and(eq(screeningTemplates.userId, userId), eq(screeningTemplates.isDefault, true)))
      .limit(1);
    const tpl = rows[0];
    const fieldsRaw: any[] = tpl?.fields
      ? typeof tpl.fields === "string"
        ? JSON.parse(tpl.fields as any)
        : (tpl.fields as any)
      : [];
    const fields: ScreeningField[] = (fieldsRaw || [])
      .map((f) => ({ id: String(f.id || f.label || "field"), label: String(f.label || f.id || "Field") }))
      .slice(0, 6);
    if (fields.length > 0) return fields;
  } catch {}
  return [
    { id: "move_in", label: "Move-in date" },
    { id: "lease_term", label: "Lease term (1 or 2 years)" },
    { id: "employment", label: "Employment type" },
    { id: "occupants", label: "Number of occupants" },
    { id: "budget", label: "Budget (SGD)" },
  ];
}

function nextWeekendSlots(): string[] {
  const now = new Date();
  const day = now.getDay(); // 0 Sun ... 6 Sat
  // Find upcoming Saturday and Sunday
  const daysUntilSat = (6 - day + 7) % 7 || 7; // at least next week
  const daysUntilSun = (0 - day + 7) % 7 || 7;
  const sat = new Date(now);
  sat.setDate(now.getDate() + daysUntilSat);
  sat.setHours(15, 0, 0, 0); // 3 PM
  const sun = new Date(now);
  sun.setDate(now.getDate() + daysUntilSun);
  sun.setHours(11, 0, 0, 0); // 11 AM
  const fmt = (d: Date) =>
    d.toLocaleString("en-SG", { weekday: "long", hour: "numeric", minute: "2-digit", hour12: true });
  return [fmt(sat), fmt(sun)];
}

let compiledApp: any = null;

export function getApp() {
  if (compiledApp) return compiledApp;

  const graph: any = new (StateGraph as any)(LeadState)
    .addNode("planner", async (state: z.infer<typeof LeadState>) => {
      const plan = await planLeadStep(state.history || [], state.message);
      return { plan };
    })
    .addNode("tool_add_property_from_url", async (state: z.infer<typeof LeadState>) => {
      const plannedUrl =
        (state.plan?.args?.url as string) ||
        extractFirstUrl(state.message) ||
        findLastUrlInHistory(state.history || []);
      if (!plannedUrl) return {};
      const r = await addPropertyFromUrl(plannedUrl, state.userId);
      const ctx = { property: r.property, created: r.created };
      const reply = await leadReply(state.history || [], state.message, ctx);
      return {
        propertyId: r.property.id,
        propertyTitle: r.property.title,
        propertyUrl: r.property.url,
        data: ctx,
        reply,
      };
    })
    .addNode("tool_get_property_details", async (state: z.infer<typeof LeadState>) => {
      if (!state.propertyId) return {};
      try {
        const rows = await db
          .select()
          .from(propertiesTable)
          .where(eq(propertiesTable.id, state.propertyId))
          .limit(1);
        const p = rows[0];
        if (!p) return {};
        return { data: { property: p } };
      } catch { return {}; }
    })
    .addNode("tool_propose_viewing", async (state: z.infer<typeof LeadState>) => {
      const slots = nextWeekendSlots();
      return { offeredSlots: slots, data: { slots } };
    })
    .addNode("tool_book_viewing", async (state: z.infer<typeof LeadState>) => {
      const text = state.message.toLowerCase();
      const slots = state.offeredSlots || nextWeekendSlots();
      const pick = slots.find((s) => text.includes(s.split(" ")[0].toLowerCase()) || text.includes(s.toLowerCase()));
      const chosen = pick || slots[0];

      const now = new Date();
      const date = new Date(now);
      const isSat = /sat/i.test(chosen);
      const isSun = /sun/i.test(chosen);
      const targetDow = isSat ? 6 : 0;
      while (date.getDay() !== targetDow) date.setDate(date.getDate() + 1);
      const is3pm = /3\s?pm/i.test(chosen);
      const is11am = /11\s?:?\s?am/i.test(chosen);
      if (is3pm) date.setHours(15, 0, 0, 0); else if (is11am) date.setHours(11, 0, 0, 0); else date.setHours(15, 0, 0, 0);
      const start = date.toISOString();
      const end = new Date(date.getTime() + 45 * 60 * 1000).toISOString();

      try { await createAppointment(state.userId, { title: state.propertyTitle ? `Viewing — ${state.propertyTitle}` : "Viewing", startTime: start, endTime: end }); } catch {}
      return { data: { booked: { when: chosen, start, end } } };
    })
    .addNode("respond", async (state: z.infer<typeof LeadState>) => {
      const base = state.data || { propertyId: state.propertyId, screeningFields: state.screeningFields, offeredSlots: state.offeredSlots };
      const hasProperty = !!(state.propertyId || (state as any)?.data?.property || (state as any)?.data?.propertyId);
      if (!hasProperty) {
        const reply = "Could you share the PropertyGuru or 99.co link, or the listing name/address? If you prefer, tell me area, bedrooms and budget and I can suggest options.";
        return { reply };
      }
      const reply = await leadReply(state.history || [], state.message, base);
      return { reply };
    })
    .addNode("answer_property_question", async (state: z.infer<typeof LeadState>) => {
      if (!state.propertyId) {
        const url = extractFirstUrl(state.message) || findLastUrlInHistory(state.history || []);
        if (url) {
          try {
            const r = await addPropertyFromUrl(url, state.userId);
            state = { ...state, propertyId: r.property.id, propertyTitle: r.property.title, propertyUrl: r.property.url } as any;
          } catch {}
        }
        if (!state.propertyId) {
          const reply = await leadReply(state.history || [], state.message, { needPropertyLink: true });
          return { reply };
        }
      }
      try {
        const rows = await db
          .select()
          .from(propertiesTable)
          .where(eq(propertiesTable.id, state.propertyId))
          .limit(1);
        const p = rows[0];
        if (!p) throw new Error("missing");
        const text = state.message.toLowerCase();
        const facts: string[] = [];
        const add = (s?: string) => { if (s && !facts.includes(s)) facts.push(s); };

        if (/price|rent|budget|cost|monthly/.test(text)) { add(String(p.price || 0)); }
        if (/size|sqft|area|floor\s?area/.test(text)) { if (p.sqft) add(String(p.sqft)); }
        if (/bed|bedroom/.test(text) || /bath|bathroom/.test(text)) { if (p.bedrooms) add(`${p.bedrooms}bd`); if (p.bathrooms) add(`${p.bathrooms}ba`); }
        if (/furnish|furnished|unfurnished/.test(text)) { if (p.furnished) add(p.furnished); }
        if (/address|where|location|mrt|distance/.test(text)) { if (p.address) add(p.address); }
        if (/available|move[-\s]?in|ready/.test(text)) { if (p.availableFrom) add(new Date(p.availableFrom).toISOString()); }

        const reply = await leadReply(state.history || [], state.message, { property: p, facts });
        return { reply };
      } catch {
        const reply = await leadReply(state.history || [], state.message, { error: "property_load_failed" });
        return { reply };
      }
    })
    .addNode("detect_property", async (state: z.infer<typeof LeadState>) => {
      const url = extractFirstUrl(state.message) || findLastUrlInHistory(state.history || []);
      if (!url) {
        const reply = "Could you share the PropertyGuru or 99.co link, or the listing name/address? I’ll pull it up for you.";
        return { reply };
      }
      try {
        const r = await addPropertyFromUrl(url, state.userId);
        const reply = await leadReply(state.history || [], state.message, { property: r.property, created: r.created });
        return {
          propertyId: r.property.id,
          propertyTitle: r.property.title,
          propertyUrl: r.property.url,
          reply,
        };
      } catch (e: any) {
        const reply = await leadReply(state.history || [], state.message, { error: "property_load_failed" });
        return { reply };
      }
    })
    .addNode("prompt_screening", async (state: z.infer<typeof LeadState>) => {
      const fields = state.screeningFields || (await getDefaultScreeningFields(state.userId));
      // If this is the first message (no history or very short history), start with a greeting and first question
      const isFirstContact = !state.history || state.history.length === 0 || state.history.length === 1;
      
      if (isFirstContact && fields.length > 0) {
        // First contact - greet and ask first screening question proactively
        const firstField = fields[0];
        const greeting = `Hi! Thanks for reaching out. I'd love to help you find the perfect rental. To get started, I have a few quick questions.\n\nFirst, ${firstField.label.toLowerCase()}?`;
        return { screeningFields: fields, screeningComplete: false, reply: greeting };
      }
      
      // Continue with screening questions
      const reply = await leadReply(state.history || [], state.message, { screeningFields: fields, propertyTitle: state.propertyTitle });
      return { screeningFields: fields, screeningComplete: false, reply };
    })
    .addNode("capture_screening_answers", async (state: z.infer<typeof LeadState>) => {
      const fields = state.screeningFields || (await getDefaultScreeningFields(state.userId));
      const prev = state.screeningAnswers || {};
      const answers = await extractScreeningAnswers(state.history || [], state.message, fields);
      const merged = { ...prev, ...answers };
      // Determine remaining unanswered fields
      const remaining = fields.filter((f) => !merged[f.id]);
      if (remaining.length > 0) {
        // Still have unanswered questions - ask for the next one proactively
        const nextField = remaining[0];
        // Acknowledge the answer briefly and ask the next question
        const reply = await leadReply(state.history || [], state.message, { screeningFields: remaining, propertyTitle: state.propertyTitle });
        // If the reply doesn't ask the next question explicitly, add it
        const hasNextQuestion = reply.toLowerCase().includes(nextField.label.toLowerCase()) || reply.toLowerCase().includes("?");
        if (!hasNextQuestion) {
          const nextQuestion = `Got it! Next question: ${nextField.label.toLowerCase()}?`;
          return { screeningFields: remaining, screeningAnswers: merged, screeningComplete: false, reply: nextQuestion };
        }
        return { screeningFields: remaining, screeningAnswers: merged, screeningComplete: false, reply };
      }
      // All screening questions answered - mark as complete and transition to normal agent mode
      const slots = nextWeekendSlots();
      const reply = await leadReply(state.history || [], state.message, { offeredSlots: slots, propertyTitle: state.propertyTitle, profile: merged });
      return { screeningAnswers: merged, screeningComplete: true, offeredSlots: slots, reply };
    })
    .addNode("propose_viewing", async (state: z.infer<typeof LeadState>) => {
      const slots = nextWeekendSlots();
      const reply = await leadReply(state.history || [], state.message, { offeredSlots: slots, propertyTitle: state.propertyTitle });
      return { offeredSlots: slots, reply };
    })
    .addNode("book_viewing", async (state: z.infer<typeof LeadState>) => {
      const text = state.message.toLowerCase();
      const slots = state.offeredSlots || nextWeekendSlots();
      const pick = slots.find((s) => text.includes(s.split(" ")[0].toLowerCase()) || text.includes(s.toLowerCase()));
      const chosen = pick || slots[0];

      // Try to construct ISO for the chosen slot (approximate)
      const now = new Date();
      const date = new Date(now);
      // crude parse: look for weekday and time markers
      const isSat = /sat/i.test(chosen);
      const isSun = /sun/i.test(chosen);
      // advance to next occurrence
      const targetDow = isSat ? 6 : 0;
      while (date.getDay() !== targetDow) date.setDate(date.getDate() + 1);
      const is3pm = /3\s?pm/i.test(chosen);
      const is11am = /11\s?:?\s?am/i.test(chosen);
      if (is3pm) date.setHours(15, 0, 0, 0);
      else if (is11am) date.setHours(11, 0, 0, 0);
      else date.setHours(15, 0, 0, 0);
      const start = date.toISOString();
      const end = new Date(date.getTime() + 45 * 60 * 1000).toISOString();

      try {
        await createAppointment(state.userId, {
          title: state.propertyTitle ? `Viewing — ${state.propertyTitle}` : "Viewing",
          startTime: start,
          endTime: end,
        });
      } catch {}

      const reply = await leadReply(state.history || [], state.message, { booked: { when: chosen, start, end }, propertyTitle: state.propertyTitle });
      return { reply };
    })
    .addNode("fallback", async (_state: z.infer<typeof LeadState>) => {
      return {
        reply:
          "Thanks for the message! I’ll have an agent follow up shortly. If you have a specific listing link, please share it so I can help faster.",
      };
    })
    .addNode(
      "router",
      async (state: z.infer<typeof LeadState>) => {
      // PRIORITY: If screening is not complete, ALWAYS redirect to screening questions
      // This ensures screening happens before any other conversation
      const isScreeningComplete = state.screeningComplete === true; // Explicitly check for true
      
      if (!isScreeningComplete) {
        // If we have screening fields set, we're in the middle of screening
        // Route to capture_screening_answers to process the user's response
        if (state.screeningFields && state.screeningFields.length > 0) {
          return new Command({ goto: "capture_screening_answers" }) as any;
        }
        // No screening fields set yet - start screening by asking first question
        // This happens on first contact - immediately ask screening questions
        return new Command({ goto: "prompt_screening" }) as any;
      }

      // After screening is complete, allow other questions and actions
      const text = state.message.toLowerCase();
      const hasUrl = !!(extractFirstUrl(state.message) || findLastUrlInHistory(state.history || []));

      // If asking property-specific questions, try answering from DB
      const propertyQ = /price|rent|budget|cost|monthly|size|sqft|area|floor\s?area|bed|bath|furnish|furnished|unfurnished|address|where|location|mrt|distance|available|move[-\s]?in|ready|floor\s?plan/.test(text);
      if (state.propertyId && propertyQ) {
        return new Command({ goto: "answer_property_question" }) as any;
      }
      if (!state.propertyId && propertyQ && hasUrl) {
        return new Command({ goto: "answer_property_question" }) as any;
      }

      // Handle property detection if URL shared
      if (!state.propertyId && hasUrl) {
        return new Command({ goto: "detect_property" }) as any;
      }
      if (!state.propertyId && /interested|listing|unit|apartment|condo|flat/.test(text)) {
        return new Command({ goto: "detect_property" }) as any;
      }

      // If user seems to agree or says sure/yes after we proposed viewing, book it
      if (/yes|sure|okay|ok|sounds good|book|schedule/.test(text) && state.offeredSlots && state.offeredSlots.length > 0) {
        return new Command({ goto: "book_viewing" }) as any;
      }

      // If mentioning specific day/time words, attempt booking
      if (/saturday|sunday|mon|tue|wed|thu|fri|pm|am|\d/.test(text) && (state.offeredSlots?.length || 0) > 0) {
        return new Command({ goto: "book_viewing" }) as any;
      }

      // If we have a property but haven't proposed viewing yet, propose it
      if (state.propertyId && !state.offeredSlots) {
      return new Command({ goto: "propose_viewing" }) as any;
      }

      // Default: respond normally (screening is complete, so allow general questions)
      return new Command({ goto: "respond" }) as any;
      },
      {
        ends: [
          "detect_property",
          "answer_property_question",
          "propose_viewing",
          "book_viewing",
          "prompt_screening",
          "capture_screening_answers",
          "respond",
          "fallback",
        ],
      }
    )
    .addEdge(START, "planner")
    .addConditionalEdges(
      "planner",
      (state: any) => {
        const p = (state as any).plan;
        // If screening is not complete, always route to screening flow
        if (!state.screeningComplete) {
          return "router";
        }
        // After screening is complete, allow tool usage
        if (!p || p.action === "respond") return "router";
        switch (p.tool) {
          case "add_property_from_url":
            return "tool_add_property_from_url";
          case "get_property_details":
            return "tool_get_property_details";
          case "propose_viewing_slots":
            return "tool_propose_viewing";
          case "book_viewing":
            return "tool_book_viewing";
          default:
            return "router";
        }
      },
      [
        "router",
        "respond",
        "tool_add_property_from_url",
        "tool_get_property_details",
        "tool_propose_viewing",
        "tool_book_viewing",
      ]
    )
    .addEdge("respond", END)
    .addEdge("router", END)
    .addEdge("tool_add_property_from_url", END)
    .addEdge("tool_get_property_details", END)
    .addEdge("tool_propose_viewing", END)
    .addEdge("tool_book_viewing", END)
    .addEdge("answer_property_question", END)
    .addEdge("detect_property", END)
    // Screening flow: 
    // - prompt_screening asks a question and ENDs (waits for user response)
    // - capture_screening_answers processes response and ENDs (asks next if incomplete, or marks complete)
    // - Router handles routing back to the right place based on state
    .addEdge("prompt_screening", END)
    .addEdge("capture_screening_answers", END)
    .addEdge("propose_viewing", END)
    .addEdge("book_viewing", END)
    .addEdge("fallback", END);

  compiledApp = graph.compile();
  return compiledApp;
}

export async function runLeadAgent(
  input: LeadInput,
  persistedState?: {
    propertyId?: string;
    propertyTitle?: string;
    propertyUrl?: string;
    screeningFields?: Array<{ id: string; label: string }>;
    screeningAnswers?: Record<string, string>;
    screeningComplete?: boolean;
    offeredSlots?: string[];
  }
): Promise<LeadResult & { state?: any }> {
  const { userId, message, history } = LeadInputSchema.parse(input);
  const app: any = getApp();
  
  // Merge persisted state into initial state
  // IMPORTANT: If screeningComplete is not explicitly true, default to false to ensure screening happens
  const initialState: any = {
    userId,
    message,
    history,
    screeningComplete: persistedState?.screeningComplete === true ? true : false, // Default to false if not explicitly true
    ...(persistedState || {}),
  };
  
  const result = await app.invoke(initialState);
  return { 
    ok: true, 
    reply: result.reply || "",
    state: {
      propertyId: result.propertyId,
      propertyTitle: result.propertyTitle,
      propertyUrl: result.propertyUrl,
      screeningFields: result.screeningFields,
      screeningAnswers: result.screeningAnswers,
      screeningComplete: result.screeningComplete ?? false, // Ensure it's always a boolean
      offeredSlots: result.offeredSlots,
    }
  };
}


