import { z } from "zod";
import { StateGraph, END, START } from "@langchain/langgraph";
import { addPropertyFromUrl } from "./tools/properties";
import { listRecentProperties, listTopProspects } from "./tools/lists";
import { smallTalkReply, planAgentStep, draftWhatsAppReply } from "./llm";
import { listTodaysAppointments, buildSchedulePageLink, getCalendlySchedulingUrl } from "./tools/calendly";
import { createAppointment } from "./tools/appointments";

export const AgentInputSchema = z.object({
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

export type AgentInput = z.infer<typeof AgentInputSchema>;

export type AgentResult = {
  ok: boolean;
  reply: string;
  data?: any;
  suggestions?: Array<{ title: string; prompt: string }>;
};

const AgentState = z.object({
  userId: z.string(),
  message: z.string(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string(),
      })
    )
    .optional(),
  route: z.string().optional(),
  reply: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
  plan: z.any().optional(),
});

function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/i);
  return m ? m[0] : null;
}

function mentionsAddProperty(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("add property") ||
    t.includes("add this property") ||
    t.includes("import property") ||
    t.includes("save this property") ||
    (t.includes("add") && t.includes("property"))
  );
}

function mentionsPropertyGuru(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("propertyguru") || /propertyguru\.com/i.test(text);
}

function mentionsListProperties(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("list properties") || t.includes("show properties") || t.includes("my properties") ||
    (t.includes("properties") && (t.includes("show") || t.includes("list") || t.includes("see")))
  );
}

function mentionsTopProspects(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("top prospects") || (t.includes("prospects") && (t.includes("top") || t.includes("best")));
}

function mentionsThanks(text: string): boolean {
  const t = text.toLowerCase().trim();
  return (
    t === "thanks" ||
    t === "thank you" ||
    t.includes("thanks!") ||
    t.includes("thank you") ||
    t.includes("thx") ||
    t.includes("appreciate it")
  );
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

// Use loose typing to avoid friction with differing LangGraph TS generics across versions
let compiledApp: any = null;

export function getApp() {
  if (compiledApp) return compiledApp;

  const graph: any = new (StateGraph as any)(AgentState)
    // Planner: decide to respond or which tool to call
    .addNode("planner", async (state: z.infer<typeof AgentState>) => {
      const plan = await planAgentStep(state.history || [], state.message);
      return { plan };
    })
    // Tools
    .addNode("tool_add_property_from_url", async (state: z.infer<typeof AgentState>) => {
      const history = state.history || [];
      const plannedUrl = (state.plan?.args?.url as string) || null;
      const urlsFromHistory = history
        .map((h) => extractFirstUrl(h.text))
        .filter((u): u is string => Boolean(u));
      const url = plannedUrl || extractFirstUrl(state.message) || urlsFromHistory.at(-1) || null;
      if (!url) {
        const variants = [
          "Got it — happy to help. Please share the PropertyGuru URL and I’ll add it for you.",
          "Sure, I can do that. Send me the PropertyGuru link and I’ll take it from there.",
          "Absolutely. Paste the PropertyGuru URL here and I’ll add the listing for you.",
        ];
        return {
          reply: pick(variants),
          suggestions: [
            { title: "Paste PropertyGuru link", prompt: "Add this property: https://propertyguru.com/..." },
          ],
        };
      }
      try {
        const result = await addPropertyFromUrl(url, state.userId);
        if (result.created) {
          return {
            reply: `Added: ${result.property.title}`,
            data: { property: result.property },
            suggestions: [
              { title: "Add another property", prompt: "Add this property: https://propertyguru.com/..." },
              { title: "Go to Properties", prompt: "Open the Properties page" },
            ],
          };
        }
        return {
          reply: `Already exists: ${result.property.title}`,
          data: { property: result.property },
          suggestions: [
            { title: "View prospects for it", prompt: `Show prospects for property ${result.property.title}` },
          ],
        };
      } catch (e: any) {
        return { error: e?.message || "Failed to add property." };
      }
    })
    .addNode("tool_list_properties", async (state: z.infer<typeof AgentState>) => {
      const rows = await listRecentProperties(state.userId, 6);
      if (rows.length === 0) {
        return {
          reply: "Looks like you don’t have any properties yet. Want me to help you add one?",
          suggestions: [{ title: "Add a PropertyGuru listing", prompt: "Add this property: https://propertyguru.com/..." }],
        };
      }
      const lines = rows.map((r) => `• ${r.title} — ${r.address} — $${(r.price || 0).toLocaleString()}/mo`).join("\n");
      return {
        reply: `Here are your recent properties:\n${lines}\n\nIf you’d like, I can pull in another listing too.`,
        suggestions: [
          { title: "Add a PropertyGuru listing", prompt: "Add this property: https://propertyguru.com/..." },
          { title: "Top prospects", prompt: "Show my top prospects" },
        ],
      };
    })
    .addNode("tool_top_prospects", async (state: z.infer<typeof AgentState>) => {
      const rows = await listTopProspects(state.userId, 5);
      if (rows.length === 0) {
        return {
          reply: "You don’t have any prospects yet. Once you add properties, I’ll surface your top leads here.",
          suggestions: [
            { title: "Add a PropertyGuru listing", prompt: "Add this property: https://propertyguru.com/..." },
          ],
        };
      }
      const lines = rows.map((r) => `• ${r.clientName} — score ${r.score}${r.propertyTitle ? ` — ${r.propertyTitle}` : ""}`).join("\n");
      return {
        reply: `Here are your top prospects right now:\n${lines}`,
        suggestions: [{ title: "Show properties", prompt: "List my properties" }],
      };
    })
    .addNode("tool_draft_whatsapp", async (state: z.infer<typeof AgentState>) => {
      const instruction = (state.plan?.args?.instruction as string) || state.message;
      const text = await draftWhatsAppReply(state.history || [], instruction);
      return { reply: text };
    })
    .addNode("tool_list_todays_schedule", async (state: z.infer<typeof AgentState>) => {
      const date = (state.plan?.args?.date as string) || "today";
      const rows = await listTodaysAppointments(state.userId, date);
      
      // Determine date label for natural response
      const now = new Date();
      let dateLabel = "today";
      if (date.toLowerCase() === "tomorrow") {
        dateLabel = "tomorrow";
      } else if (date.toLowerCase() !== "today") {
        try {
          const parsed = new Date(date);
          if (!isNaN(parsed.getTime())) {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
            const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) dateLabel = "today";
            else if (diffDays === 1) dateLabel = "tomorrow";
            else dateLabel = parsed.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          }
        } catch {}
      }
      
      if (rows.length === 0) {
        const url = (await getCalendlySchedulingUrl(state.userId)) || undefined;
        const suggestion = url ? [{ title: "Share scheduling link", prompt: "Share my scheduling link" }] : [];
        const responses = [
          `You're free ${dateLabel}! No appointments scheduled.`,
          `Nothing on your calendar ${dateLabel}.`,
          `You have a clear schedule ${dateLabel}.`,
        ];
        return { reply: responses[Math.floor(Math.random() * responses.length)], suggestions: suggestion };
      }
      const lines = rows.map((r) => {
        const t = r.startTime ? new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
        return `• ${t} — ${r.title || 'Meeting'}${r.invitee ? ` — ${r.invitee}` : ''}`;
      }).join("\n");
      const responses = [
        `Here's what you have ${dateLabel}:\n${lines}`,
        `Your schedule ${dateLabel}:\n${lines}`,
        `${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} looks like:\n${lines}`,
      ];
      return { reply: responses[Math.floor(Math.random() * responses.length)] };
    })
    .addNode("tool_build_schedule_link", async (state: z.infer<typeof AgentState>) => {
      const name = (state.plan?.args?.name as string) || undefined;
      const email = (state.plan?.args?.email as string) || undefined;
      const phone = (state.plan?.args?.phone as string) || undefined;
      const link = buildSchedulePageLink({ name, email, phone });
      return { reply: `Here’s a link to book a time: ${link}` };
    })
    .addNode("tool_create_appointment", async (state: z.infer<typeof AgentState>) => {
      const args = state.plan?.args || {};
      if (!args.startTime || !args.endTime) {
        return { reply: "I need a start and end time to create the appointment." };
      }
      const result = await createAppointment(state.userId, {
        title: args.title,
        description: args.description,
        startTime: args.startTime,
        endTime: args.endTime,
        inviteeName: args.inviteeName,
        inviteeEmail: args.inviteeEmail,
        inviteePhone: args.inviteePhone,
      });
      return { reply: result.createdGoogle ? "Booked and added to your Google Calendar." : "Booked in your schedule." };
    })
    // Direct response
    .addNode("respond", async (state: z.infer<typeof AgentState>) => {
      const replyRaw = state.plan?.reply || (await smallTalkReply(state.history || [], state.message));
      const reply = (replyRaw || "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/[#*_`>-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return {
        reply,
        suggestions: [
          { title: "Add a PropertyGuru listing", prompt: "Add this property: https://propertyguru.com/..." },
          { title: "Show all properties", prompt: "List my properties" },
          { title: "Top prospects", prompt: "Show my top prospects" },
        ],
      };
    })
    .addEdge(START, "planner")
    .addConditionalEdges(
      "planner",
      (state: z.infer<typeof AgentState>) => {
        const p = (state as any).plan;
        if (!p || p.action === "respond") return "respond";
        switch (p.tool) {
          case "add_property_from_url":
            return "tool_add_property_from_url";
          case "list_properties":
            return "tool_list_properties";
          case "top_prospects":
            return "tool_top_prospects";
          case "draft_whatsapp":
            return "tool_draft_whatsapp";
          case "list_todays_schedule":
            return "tool_list_todays_schedule";
          case "build_schedule_link":
            return "tool_build_schedule_link";
          case "create_appointment":
            return "tool_create_appointment";
          default:
            return "respond";
        }
      },
      [
        "respond",
        "tool_add_property_from_url",
        "tool_list_properties",
        "tool_top_prospects",
        "tool_draft_whatsapp",
        "tool_list_todays_schedule",
        "tool_build_schedule_link",
        "tool_create_appointment",
      ]
    )
    .addEdge("respond", END)
    .addEdge("tool_add_property_from_url", END)
    .addEdge("tool_list_properties", END)
    .addEdge("tool_top_prospects", END)
    .addEdge("tool_draft_whatsapp", END)
    .addEdge("tool_list_todays_schedule", END)
    .addEdge("tool_build_schedule_link", END)
    .addEdge("tool_create_appointment", END);

  compiledApp = graph.compile();
  return compiledApp;
}

export async function runAgent(input: AgentInput): Promise<AgentResult> {
  const { userId, message, history } = AgentInputSchema.parse(input);
  const app: any = getApp();
  const result = await app.invoke({ userId, message, history });
  if (result.error) return { ok: false, reply: result.error };
  return {
    ok: true,
    reply: result.reply || "",
    data: result.data,
    suggestions: result.suggestions || result.data?.suggestions || [],
  };
}


