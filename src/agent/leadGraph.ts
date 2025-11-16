import { z } from "zod";
import { StateGraph, END, START, Command } from "@langchain/langgraph";
import { addPropertyFromUrl } from "./tools/properties";
import { createAppointment } from "./tools/appointments";
import { db, screeningTemplates, properties as propertiesTable } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { leadReply, planLeadStep, extractScreeningAnswers } from "./llm";
import { loadAutomationConfig, getDefaultAutomationConfig } from "@/lib/botConfigLoader";
import { isPhaseAutomated, shouldProceedWithPhase } from "@/lib/botConfigParser";

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

type ScreeningField = { id: string; label: string; prompt?: string };

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
  screeningFields: z.array(z.object({ id: z.string(), label: z.string(), prompt: z.string().optional() })).optional(),
  screeningAnswers: z.record(z.string(), z.string()).optional(),
  screeningComplete: z.boolean().optional(),
  offeredSlots: z.array(z.string()).optional(),
  plan: z.any().optional(),
  data: z.any().optional(),
  reply: z.string().optional(),
  clientId: z.string().optional(), // For client-specific automation rules
  automationConfig: z.any().optional(), // Loaded automation configuration
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
      .map((f) => ({ 
        id: String(f.id || f.label || "field"), 
        label: String(f.label || f.id || "Field"),
        prompt: f.prompt || f.label // Include prompt!
      }))
      .slice(0, 6);
    if (fields.length > 0) return fields;
  } catch {}
  return [
    { id: "move_in", label: "Move-in date", prompt: "When do you need to move in?" },
    { id: "lease_term", label: "Lease term (1 or 2 years)", prompt: "How long is your lease term?" },
    { id: "employment", label: "Employment type", prompt: "What's your employment status?" },
    { id: "occupants", label: "Number of occupants", prompt: "How many people will be living here?" },
    { id: "budget", label: "Budget (SGD)", prompt: "What's your monthly budget?" },
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

// Force recompile (useful during development)
export function clearCache() {
  compiledApp = null;
  console.log('[leadGraph] ✅ Cache cleared - will recompile on next use');
}

export function getApp() {
  // IN DEVELOPMENT: ALWAYS RECOMPILE
  if (process.env.NODE_ENV === 'development') {
    console.log('[leadGraph] 🔄 Development mode - forcing fresh compile');
    compiledApp = null;
  }
  
  if (compiledApp) {
    console.log('[leadGraph] ♻️ Using cached graph');
    return compiledApp;
  }
  
  console.log('[leadGraph] 🆕 Compiling new graph...');

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
      
      console.log('[tool_add_property_from_url] Property added:', r.property.title);
      
      // DON'T generate conversational reply - just acknowledge
      const reply = `Got the link! I'm looking at ${r.property.title}.`;
      
      return {
        propertyId: r.property.id,
        propertyTitle: r.property.title,
        propertyUrl: r.property.url,
        data: { property: r.property, created: r.created },
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
      const config = state.automationConfig || getDefaultAutomationConfig();
      const base = state.data || { propertyId: state.propertyId, screeningFields: state.screeningFields, offeredSlots: state.offeredSlots };
      const hasProperty = !!(state.propertyId || (state as any)?.data?.property || (state as any)?.data?.propertyId);
      
      if (!hasProperty) {
        // Use custom no property message from config or default
        const noPropertyMessage = config.phaseSettings?.handoff?.noPropertyMessage
          || "Could you share the PropertyGuru or 99.co link, or the listing name/address? If you prefer, tell me area, bedrooms and budget and I can suggest options.";
        return { reply: noPropertyMessage };
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
        const reply = "Could you share the PropertyGuru or 99.co link, or the listing name/address? I'll pull it up for you.";
        return { reply };
      }
      try {
        const r = await addPropertyFromUrl(url, state.userId);
        
        console.log('[detect_property] Property added:', r.property.title);
        
        // Simple acknowledgment - let the router decide next steps (screening, etc.)
        const reply = `Got the link! I'm looking at ${r.property.title}.`;
        
        return {
          propertyId: r.property.id,
          propertyTitle: r.property.title,
          propertyUrl: r.property.url,
          reply,
        };
      } catch (e: any) {
        const reply = "Sorry, I couldn't load that property. Could you share another link?";
        console.error('[detect_property] Error:', e);
        return { reply };
      }
    })
    .addNode("prompt_screening", async (state: z.infer<typeof LeadState>) => {
      // ALWAYS reload config fresh (don't use cached state.automationConfig)
      const config = await loadAutomationConfig(state.userId, {
        clientId: state.clientId,
        propertyId: state.propertyId,
      }) || getDefaultAutomationConfig();
      
      console.log('[prompt_screening] ===== DEBUG =====');
      console.log('[prompt_screening] Loaded config:', {
        hasScreeningSettings: !!config.phaseSettings?.screening,
        hasQuestions: !!config.phaseSettings?.screening?.questions,
        questionCount: config.phaseSettings?.screening?.questions?.length || 0,
        fullScreeningConfig: config.phaseSettings?.screening
      });
      
      let fields: Array<{ id: string; label: string; prompt?: string }> = [];
      let openingMessage = "Great! Let me ask you a few quick questions.";
      
      // Use custom questions from config if available
      if (config.phaseSettings?.screening?.questions && config.phaseSettings.screening.questions.length > 0) {
        fields = config.phaseSettings.screening.questions.map((q: any) => ({
          id: q.id || q.label.toLowerCase().replace(/\s+/g, '_'),
          label: q.label,
          prompt: q.prompt || q.label
        }));
        
        if (config.phaseSettings.screening.openingMessage) {
          openingMessage = config.phaseSettings.screening.openingMessage;
        }
        
        console.log('[prompt_screening] ✅ Using custom questions from config:', fields);
      } else {
        console.log('[prompt_screening] ⚠️ No custom questions found, loading defaults');
        // Fall back to defaults
        fields = await getDefaultScreeningFields(state.userId);
      }
      
      // Build the screening message with opening + all questions
      const questionsList = fields.map((f: any, idx: number) => 
        `${idx + 1}) ${f.prompt || f.label}`
      ).join('\n');
      
      const reply = `${openingMessage}\n\n${questionsList}`;
      
      console.log('[prompt_screening] ===== FINAL OUTPUT =====');
      console.log('[prompt_screening] Opening:', openingMessage);
      console.log('[prompt_screening] Questions:', questionsList);
      console.log('[prompt_screening] Full reply:', reply);
      
      return { screeningFields: fields, screeningComplete: false, reply };
    })
    .addNode("capture_screening_answers", async (state: z.infer<typeof LeadState>) => {
      // ALWAYS reload config fresh to get latest questions
      let fields: Array<{ id: string; label: string; prompt?: string }> = [];
      
      if (state.screeningFields && state.screeningFields.length > 0) {
        // Use fields from state if already set
        fields = state.screeningFields;
      } else {
        // Load from bot config (same logic as prompt_screening)
        const config = await loadAutomationConfig(state.userId, {
          clientId: state.clientId,
          propertyId: state.propertyId,
        }) || getDefaultAutomationConfig();
        
        if (config.phaseSettings?.screening?.questions && config.phaseSettings.screening.questions.length > 0) {
          fields = config.phaseSettings.screening.questions.map((q: any) => ({
            id: q.id || q.label.toLowerCase().replace(/\s+/g, '_'),
            label: q.label,
            prompt: q.prompt || q.label
          }));
          console.log('[capture_screening_answers] ✅ Loaded questions from bot config:', fields.length);
        } else {
          // Fall back to defaults
          fields = await getDefaultScreeningFields(state.userId);
          console.log('[capture_screening_answers] ⚠️ Using default screening fields');
        }
      }
      
      const prev = state.screeningAnswers || {};
      const answers = await extractScreeningAnswers(state.history || [], state.message, fields);
      const merged = { ...prev, ...answers };
      
      console.log('[capture_screening_answers] Extracted answers:', answers);
      console.log('[capture_screening_answers] Merged answers:', merged);
      
      // Determine remaining unanswered fields
      // Check both id and label since answers can be keyed by either
      const remaining = fields.filter((f) => {
        const hasAnswerById = merged[f.id] && merged[f.id] !== 'not specified';
        const hasAnswerByLabel = merged[f.label] && merged[f.label] !== 'not specified';
        return !hasAnswerById && !hasAnswerByLabel;
      });
      
      console.log('[capture_screening_answers] Remaining fields:', remaining);
      
      if (remaining.length > 0) {
        // DON'T use LLM - use exact configured question prompts!
        const questionsList = remaining.map((f: any, idx: number) => 
          `${idx + 1}) ${f.prompt || f.label}`
        ).join('\n');
        
        // Build reply with answered values acknowledgment + remaining questions
        const acknowledgedFields = fields.filter((f) => {
          const hasAnswerById = merged[f.id] && merged[f.id] !== 'not specified';
          const hasAnswerByLabel = merged[f.label] && merged[f.label] !== 'not specified';
          return hasAnswerById || hasAnswerByLabel;
        });
        
        let reply = '';
        
        if (acknowledgedFields.length > 0) {
          const acks = acknowledgedFields.map(f => {
            const answer = merged[f.id] || merged[f.label];
            return `${f.label}: ${answer}`;
          }).join(', ');
          reply = `Got it! (${acks})\n\nJust a few more questions:\n\n${questionsList}`;
        } else {
          reply = `Thanks! Please answer these questions:\n\n${questionsList}`;
        }
        
        console.log('[capture_screening_answers] Asking remaining questions:', reply);
        console.log('[capture_screening_answers] Remaining count:', remaining.length);
        
        return { screeningFields: fields, screeningAnswers: merged, screeningComplete: false, reply };
      }
      
      // All screening questions answered - mark as complete
      console.log('[capture_screening_answers] 🎉 ALL QUESTIONS ANSWERED! Marking screening complete');
      
      const reply = "Perfect! Thanks for providing all the information. How can I help you with this property?";
      
      return { screeningAnswers: merged, screeningComplete: true, reply };
    })
    .addNode("propose_viewing", async (state: z.infer<typeof LeadState>) => {
      const config = state.automationConfig || getDefaultAutomationConfig();
      const slots = nextWeekendSlots();
      
      // Use custom proposal message from config or generate via LLM
      const customMessage = config.phaseSettings?.viewing?.proposalMessage;
      let reply: string;
      
      if (customMessage) {
        // Use custom message with slot placeholders
        reply = `${customMessage}\n\nAvailable slots:\n• ${slots[0]}\n• ${slots[1]}`;
      } else {
        // Generate reply via LLM
        reply = await leadReply(state.history || [], state.message, { offeredSlots: slots, propertyTitle: state.propertyTitle });
      }
      
      return { offeredSlots: slots, reply };
    })
    .addNode("book_viewing", async (state: z.infer<typeof LeadState>) => {
      const config = state.automationConfig || getDefaultAutomationConfig();
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
      
      // Use custom duration from config or default 45 mins
      const durationMinutes = parseInt(config.phaseSettings?.viewing?.defaultDuration || '45');
      const end = new Date(date.getTime() + durationMinutes * 60 * 1000).toISOString();

      try {
        await createAppointment(state.userId, {
          title: state.propertyTitle ? `Viewing — ${state.propertyTitle}` : "Viewing",
          startTime: start,
          endTime: end,
        });
      } catch {}

      // Use custom confirmation message from config or generate via LLM
      const customMessage = config.phaseSettings?.viewing?.confirmationMessage;
      let reply: string;
      
      if (customMessage) {
        reply = customMessage.replace('{slot}', chosen);
      } else {
        reply = await leadReply(state.history || [], state.message, { booked: { when: chosen, start, end }, propertyTitle: state.propertyTitle });
      }
      
      return { reply };
    })
    .addNode("fallback", async (state: z.infer<typeof LeadState>) => {
      // Load config to customize fallback message based on automation settings
      const config = state.automationConfig || await loadAutomationConfig(state.userId, {
        clientId: state.clientId,
        propertyId: state.propertyId,
      }) || getDefaultAutomationConfig();
      
      // Use custom fallback message from config or default
      const fallbackMessage = config.phaseSettings?.handoff?.fallbackMessage 
        || config.phaseSettings?.handoff?.message
        || "Thanks for the message! I'll have an agent follow up shortly. If you have a specific listing link, please share it so I can help faster.";
      
      return {
        reply: fallbackMessage,
      };
    })
    .addNode(
      "router",
      async (state: z.infer<typeof LeadState>) => {
      // Load automation config if not already loaded
      let config = state.automationConfig;
      if (!config) {
        config = await loadAutomationConfig(state.userId, {
          clientId: state.clientId,
          propertyId: state.propertyId,
        }) || getDefaultAutomationConfig();
      }

      const text = state.message.toLowerCase();
      const hasUrl = !!(extractFirstUrl(state.message) || findLastUrlInHistory(state.history || []));
      const hasPropertyId = !!state.propertyId;

      // --- PHASE 1: Ensure we have a property in context before doing anything heavy ---
      // Property detection should run BEFORE screening so that the bot
      // never jumps into screening without at least a listing link or property attached.
      const propertyDetectionAutomated = isPhaseAutomated(config, "property_detection");
      if (!hasPropertyId && hasUrl && propertyDetectionAutomated) {
        if (shouldProceedWithPhase(config, "property_detection", "beforePropertyAdd")) {
          return new Command({ goto: "detect_property" }) as any;
        }
      }
      if (!hasPropertyId && /interested|listing|unit|apartment|condo|flat/.test(text) && propertyDetectionAutomated) {
        if (shouldProceedWithPhase(config, "property_detection", "beforePropertyAdd")) {
          return new Command({ goto: "detect_property" }) as any;
        }
      }

      // PRIORITY: Check if screening is automated
      const screeningAutomated = isPhaseAutomated(config, "screening");
      
      console.log('[router] ===== SCREENING CHECK =====');
      console.log('[router] screeningComplete:', state.screeningComplete);
      console.log('[router] screeningAutomated:', screeningAutomated);
      console.log('[router] hasPropertyId:', hasPropertyId);
      console.log('[router] hasUrl:', hasUrl);
      console.log('[router] screeningFields:', state.screeningFields);
      console.log('[router] screeningAnswers:', state.screeningAnswers);
      
      // If screening is already complete, skip screening flow
      if (state.screeningComplete) {
        console.log('[router] ✅ Screening already complete - skipping to other phases');
        // Continue to other checks below (Q&A, viewing, etc.)
      }
      
      // If screening is not complete and screening is automated, redirect to screening questions
      else if (!state.screeningComplete && screeningAutomated) {
        console.log('[router] ✅ Screening needed and automated');
        
        // 🔒 Guard: don't start screening until we at least have a property in play
        // or a URL we can turn into one. Otherwise, ask for a link / basic details instead.
        if (!hasPropertyId && !hasUrl) {
          console.log('[router] ⚠️ No property or URL - asking for link');
          // `respond` node will notice there's no property and politely ask for a link
          return new Command({ goto: "respond" }) as any;
        }

        // Check if we should proceed with screening
        if (!shouldProceedWithPhase(config, "screening", "beforeScreening")) {
          console.log('[router] ⚠️ Screening requires approval - falling back');
          // Screening requires approval - hand off to human
          return new Command({ goto: "fallback" }) as any;
        }
        
        // Check if we have actual partial answers (not just "not specified")
        const hasRealAnswers = state.screeningAnswers && Object.values(state.screeningAnswers).some(
          (val) => val && val !== 'not specified' && val.trim() !== ''
        );
        
        // If we have screening fields AND real answers, we're in the middle of screening
        // Route to capture_screening_answers to process the user's response
        if (state.screeningFields && state.screeningFields.length > 0 && hasRealAnswers) {
          console.log('[router] → Going to capture_screening_answers (mid-screening with', 
            Object.keys(state.screeningAnswers || {}).length, 'answers)');
          return new Command({ goto: "capture_screening_answers" }) as any;
        }
        
        // No screening started yet - ask all questions
        console.log('[router] → Going to prompt_screening (start fresh screening)');
        return new Command({ goto: "prompt_screening" }) as any;
      }
      
      console.log('[router] ⚠️ Screening check failed - either complete or not automated');
      console.log('[router] Moving to other checks...');
      
      // If screening is not automated but not complete, hand off to human
      if (!state.screeningComplete && !screeningAutomated) {
        return new Command({ goto: "fallback" }) as any;
      }

      // After screening is complete, allow other questions and actions based on config
      // If asking property-specific questions, try answering from DB
      const propertyQ = /price|rent|budget|cost|monthly|size|sqft|area|floor\s?area|bed|bath|furnish|furnished|unfurnished|address|where|location|mrt|distance|available|move[-\s]?in|ready|floor\s?plan/.test(text);
      const propertyQaAutomated = isPhaseAutomated(config, "property_qa");
      
      if (state.propertyId && propertyQ && propertyQaAutomated) {
        if (shouldProceedWithPhase(config, "property_qa")) {
          return new Command({ goto: "answer_property_question" }) as any;
        }
      }
      if (!state.propertyId && propertyQ && hasUrl && propertyQaAutomated) {
        if (shouldProceedWithPhase(config, "property_qa")) {
          return new Command({ goto: "answer_property_question" }) as any;
        }
      }

      // Handle property detection if URL shared
      // (Handled above, before screening)

      // If user seems to agree or says sure/yes after we proposed viewing, book it
      const bookingAutomated = isPhaseAutomated(config, "viewing_booking");
      if (/yes|sure|okay|ok|sounds good|book|schedule/.test(text) && state.offeredSlots && state.offeredSlots.length > 0 && bookingAutomated) {
        if (shouldProceedWithPhase(config, "viewing_booking", "beforeViewingBooking")) {
          return new Command({ goto: "book_viewing" }) as any;
        } else {
          // Requires approval - notify and hand off
          return new Command({ goto: "fallback" }) as any;
        }
      }

      // If mentioning specific day/time words, attempt booking
      if (/saturday|sunday|mon|tue|wed|thu|fri|pm|am|\d/.test(text) && (state.offeredSlots?.length || 0) > 0 && bookingAutomated) {
        if (shouldProceedWithPhase(config, "viewing_booking", "beforeViewingBooking")) {
          return new Command({ goto: "book_viewing" }) as any;
        }
      }

      // If we have a property but haven't proposed viewing yet, propose it
      const viewingProposalAutomated = isPhaseAutomated(config, "viewing_proposal");
      const autoPropose = (config as any).phaseSettings?.viewing?.autoPropose !== false; // Default true
      
      // Auto-propose if: property set, screening complete, no viewing offered yet, and user just engaged with property
      if (state.propertyId && state.screeningComplete && !state.offeredSlots && viewingProposalAutomated && autoPropose) {
        // Trigger after property Q&A or when appropriate
        if (propertyQ || /view|see|visit|schedule/.test(text)) {
          if (shouldProceedWithPhase(config, "viewing_proposal", "beforeViewingProposal")) {
            return new Command({ goto: "propose_viewing" }) as any;
          }
        }
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
        
        console.log('[planner conditional] screeningComplete:', state.screeningComplete);
        console.log('[planner conditional] plan:', p);
        
        // If screening is not complete, ALWAYS route to router (not to tools)
        // This ensures we go through screening before using any tools
        if (!state.screeningComplete) {
          console.log('[planner conditional] → Routing to router (screening not complete)');
          return "router";
        }
        
        // After screening is complete, allow tool usage
        if (!p || p.action === "respond") {
          console.log('[planner conditional] → Routing to router (no plan or respond action)');
          return "router";
        }
        
        console.log('[planner conditional] → Routing to tool:', p.tool);
        
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
    clientId?: string;
  }
): Promise<LeadResult & { state?: any }> {
  const { userId, message, history } = LeadInputSchema.parse(input);
  const app: any = getApp();
  
  console.log('[runLeadAgent] ===== ENTRY POINT =====');
  console.log('[runLeadAgent] userId:', userId);
  console.log('[runLeadAgent] message:', message);
  console.log('[runLeadAgent] persistedState:', persistedState);
  
  // Load automation config for this user/client/property
  const automationConfig = await loadAutomationConfig(userId, {
    clientId: persistedState?.clientId,
    propertyId: persistedState?.propertyId,
  }) || getDefaultAutomationConfig();
  
  console.log('[runLeadAgent] ===== LOADED CONFIG =====');
  console.log('[runLeadAgent] automatedPhases:', automationConfig.automatedPhases);
  console.log('[runLeadAgent] Has screening settings?', !!automationConfig.phaseSettings?.screening);
  console.log('[runLeadAgent] Screening config:', JSON.stringify(automationConfig.phaseSettings?.screening, null, 2));
  
  // Merge persisted state into initial state
  const initialState: any = {
    userId,
    message,
    history,
    automationConfig,
    ...(persistedState || {}),
  };
  
  console.log('[runLeadAgent] ===== INITIAL STATE =====');
  console.log('[runLeadAgent] initialState:', JSON.stringify(initialState, null, 2));
  
  const result = await app.invoke(initialState);
  
  console.log('[runLeadAgent] ===== RESULT =====');
  console.log('[runLeadAgent] reply:', result.reply);
  console.log('[runLeadAgent] screeningFields:', result.screeningFields);
  console.log('[runLeadAgent] screeningComplete:', result.screeningComplete);
  
  return { 
    ok: true, 
    reply: result.reply || "",
    state: {
      propertyId: result.propertyId,
      propertyTitle: result.propertyTitle,
      propertyUrl: result.propertyUrl,
      screeningFields: result.screeningFields,
      screeningAnswers: result.screeningAnswers,
      screeningComplete: result.screeningComplete,
      offeredSlots: result.offeredSlots,
      clientId: result.clientId || persistedState?.clientId,
    }
  };
}


