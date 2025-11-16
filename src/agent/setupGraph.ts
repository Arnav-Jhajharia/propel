import { z } from "zod";
import { StateGraph, END, START } from "@langchain/langgraph";
import { planSetupStep, draftWhatsAppReply } from "./llm";
import { addPropertyFromUrl } from "./tools/properties";
import {
  getSetupChecklist,
  saveQuestionnaire,
  saveCalendlyUrl,
  getGoogleOAuthLink,
  ensureDefaultPreferences,
  markOnboardingCompleted,
} from "./tools/setup";
import { buildSchedulePageLink } from "./tools/calendly";

export const SetupInputSchema = z.object({
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

export type SetupInput = z.infer<typeof SetupInputSchema>;

export type SetupResult = {
  ok: boolean;
  reply: string;
  suggestions?: Array<{ title: string; prompt: string }>;
};

const SetupState = z.object({
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
  plan: z.any().optional(),
  reply: z.string().optional(),
  data: z.any().optional(),
});

let compiledApp: any = null;

function suggestionsFromChecklist(c: Awaited<ReturnType<typeof getSetupChecklist>>) {
  const s: Array<{ title: string; prompt: string }> = [];
  if (!c.hasWhatsapp) s.push({ title: "Connect WhatsApp", prompt: "Connect WhatsApp" });
  if (!c.hasGoogleCalendar) s.push({ title: "Connect Google Calendar", prompt: "Connect Google Calendar" });
  if (!c.hasCalendlyUrl) s.push({ title: "Set Calendly URL", prompt: "My Calendly URL is https://calendly.com/yourname" });
  if (!c.hasProperty) s.push({ title: "Add first property", prompt: "Add this property: https://propertyguru.com/..." });
  if (!c.hasQuestionnaire) s.push({ title: "Configure questionnaire", prompt: "Set up my screening questions" });
  s.push({ title: "Share booking link", prompt: "Share a booking link" });
  return s;
}

export function getApp() {
  if (compiledApp) return compiledApp;

  const graph: any = new (StateGraph as any)(SetupState)
    .addNode("planner", async (state: z.infer<typeof SetupState>) => {
      const plan = await planSetupStep(state.history || [], state.message);
      return { plan };
    })
    .addNode("tool_checklist", async (state: z.infer<typeof SetupState>) => {
      const c = await getSetupChecklist(state.userId);
      const items: string[] = [];
      if (!c.hasWhatsapp) items.push("Connect WhatsApp Business");
      if (!c.hasGoogleCalendar) items.push("Connect Google Calendar");
      if (!c.hasCalendlyUrl) items.push("Set your Calendly URL");
      if (!c.hasProperty) items.push("Add your first property");
      if (!c.hasQuestionnaire) items.push("Configure your screening questionnaire");
      const done = items.length === 0;
      const reply = done
        ? "Setup looks complete. You’re all set!"
        : `Here’s what I recommend next: ${items.join(", ")}.`;
      return { reply, data: { checklist: c }, suggestions: suggestionsFromChecklist(c) } as any;
    })
    .addNode("tool_save_questionnaire", async (state: z.infer<typeof SetupState>) => {
      const fields = (state.plan?.args?.fields as any[]) || [
        { id: "nationality", label: "Nationality / Pass Type", type: "text", required: true },
        { id: "occupation", label: "Occupation", type: "text", required: true },
        { id: "tenants", label: "Number of tenants & gender", type: "text", required: true },
        { id: "move_in", label: "Move-in date", type: "date", required: true },
        { id: "budget", label: "Budget (SGD)", type: "text" },
        { id: "pets", label: "Any pets?", type: "text" },
        { id: "location", label: "Preferred areas", type: "text" },
      ];
      await saveQuestionnaire(state.userId, fields);
      await ensureDefaultPreferences(state.userId);
      return {
        reply: "Saved your screening questionnaire.",
        suggestions: [
          { title: "Set Calendly URL", prompt: "My Calendly URL is https://calendly.com/yourname" },
          { title: "Add first property", prompt: "Add this property: https://propertyguru.com/..." },
        ],
      } as any;
    })
    .addNode("tool_google_auth_link", async (_state: z.infer<typeof SetupState>) => {
      const link = getGoogleOAuthLink();
      return { reply: `Connect your Google Calendar here: ${link}` };
    })
    .addNode("tool_set_calendly_url", async (state: z.infer<typeof SetupState>) => {
      const url: string | undefined = state.plan?.args?.url;
      if (!url) return { reply: "Please share your Calendly URL (e.g., https://calendly.com/yourname)." };
      await saveCalendlyUrl(state.userId, url);
      return { reply: "Calendly URL saved." };
    })
    .addNode("tool_add_property_from_url", async (state: z.infer<typeof SetupState>) => {
      const plannedUrl = (state.plan?.args?.url as string) || null;
      if (!plannedUrl) return { reply: "Share the PropertyGuru link and I’ll add it." };
      try {
        const res = await addPropertyFromUrl(plannedUrl, state.userId);
        return { reply: res.created ? `Added: ${res.property.title}` : `Already exists: ${res.property.title}` };
      } catch (e: any) {
        return { reply: e?.message || "Failed to add property." };
      }
    })
    .addNode("tool_share_booking_link", async (state: z.infer<typeof SetupState>) => {
      const name = (state.plan?.args?.name as string) || undefined;
      const email = (state.plan?.args?.email as string) || undefined;
      const phone = (state.plan?.args?.phone as string) || undefined;
      const link = buildSchedulePageLink({ name, email, phone });
      return { reply: `Here’s a link to book a time: ${link}` };
    })
    .addNode("finalize", async (state: z.infer<typeof SetupState>) => {
      const c = await getSetupChecklist(state.userId);
      if (c.hasWhatsapp && (c.hasGoogleCalendar || c.hasCalendlyUrl) && c.hasQuestionnaire) {
        await markOnboardingCompleted(state.userId);
        return { reply: "Setup complete. Welcome!" };
      }
      return { reply: "Almost there. Connect calendar and set questionnaire to wrap up." };
    })
    .addNode("respond", async (state: z.infer<typeof SetupState>) => {
      const text = await draftWhatsAppReply(state.history || [], state.message);
      return { reply: text };
    })
    .addEdge(START, "planner")
    .addConditionalEdges(
      "planner",
      (state: z.infer<typeof SetupState>) => {
        const p = (state as any).plan;
        if (!p || p.action === "respond") return "respond";
        switch (p.tool) {
          case "setup_checklist":
            return "tool_checklist";
          case "setup_save_questionnaire":
            return "tool_save_questionnaire";
          case "setup_google_auth_link":
            return "tool_google_auth_link";
          case "setup_set_calendly_url":
            return "tool_set_calendly_url";
          case "add_property_from_url":
            return "tool_add_property_from_url";
          case "share_booking_link":
            return "tool_share_booking_link";
          case "finalize_setup":
            return "finalize";
          default:
            return "respond";
        }
      },
      [
        "respond",
        "tool_checklist",
        "tool_save_questionnaire",
        "tool_google_auth_link",
        "tool_set_calendly_url",
        "tool_add_property_from_url",
        "tool_share_booking_link",
        "finalize",
      ]
    )
    .addEdge("respond", END)
    .addEdge("tool_checklist", END)
    .addEdge("tool_save_questionnaire", END)
    .addEdge("tool_google_auth_link", END)
    .addEdge("tool_set_calendly_url", END)
    .addEdge("tool_add_property_from_url", END)
    .addEdge("tool_share_booking_link", END)
    .addEdge("finalize", END);

  compiledApp = graph.compile();
  return compiledApp;
}

export async function runSetupAgent(input: SetupInput): Promise<SetupResult> {
  const { userId, message, history } = SetupInputSchema.parse(input);
  const app: any = getApp();
  const result = await app.invoke({ userId, message, history });
  return {
    ok: true,
    reply: result.reply || "",
    suggestions: result.suggestions || [],
  };
}





