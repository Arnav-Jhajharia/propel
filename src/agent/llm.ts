import OpenAI from "openai";
import { z } from "zod";

let _client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (_client) return _client;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export async function smallTalkReply(history: Array<{ role: "user" | "assistant"; text: string }>, message: string): Promise<string> {
  try {
    const client = getClient();
    const msgs = [
      {
        role: "system" as const,
        content:
        "You are a friendly, natural rental agent texting over WhatsApp. Be conversational and human-like. Use contractions, casual language, and match the user's tone. Avoid corporate phrases like 'assist you' or 'support request'. Never sound templated or robotic. Mirror the user's wording and energy level. Keep replies to 1–2 sentences unless the user asks for more. If the user only greets or chats, steer toward the task naturally with one question like: 'Looking at a listing or want options?' or 'Do you have a link I can pull up?'.",
      },
      ...history.slice(-6).map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: message },
    ];
    const r = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: msgs as any,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 220,
    });
    return r.choices?.[0]?.message?.content?.trim() || "I’m here to help.";
  } catch {
    return "I’m here to help.";
  }
}


// Tool planning
export const ToolPlanSchema = z.object({
  action: z.enum(["respond", "tool"]),
  tool: z
    .enum([
      "add_property_from_url",
      "list_properties",
      "top_prospects",
      "draft_whatsapp",
      "list_todays_schedule",
      "build_schedule_link",
      // setup tools
      "setup_checklist",
      "setup_save_questionnaire",
      "setup_google_auth_link",
      "setup_set_calendly_url",
      "share_booking_link",
      "finalize_setup",
    ]) 
    .optional(),
  args: z.record(z.string(), z.any()).optional(),
  reply: z.string().optional(),
});

export type ToolPlan = z.infer<typeof ToolPlanSchema>;

export async function planAgentStep(
  history: Array<{ role: "user" | "assistant"; text: string }>,
  message: string
): Promise<ToolPlan> {
  const client = getClient();
  const msgs = [
    {
      role: "system" as const,
      content:
        "You are a friendly, conversational assistant for a property rental dashboard. Be natural and human-like in your responses. Use contractions, casual language, and match the user's tone.\n\nChoose to call a function tool or reply directly:\n- If a PropertyGuru or 99.co URL is present, call add_property_from_url with it.\n- If the user asks to see properties or prospects, call the matching tool.\n- If the user asks about schedule, meetings, booking, or availability, call list_todays_schedule with the appropriate date parameter:\n  * If they say 'today' or 'How's my day looking like today', use date: 'today'\n  * If they say 'tomorrow' or 'Tomorrow?', use date: 'tomorrow'\n  * If they mention a specific date, parse it and use ISO format (YYYY-MM-DD)\n  * If no date is mentioned, default to 'today'\n\nWhen creating appointments, NEVER ask the user for ISO timestamps. Parse natural phrases like 'tomorrow 3 PM' or 'Fri 11am' yourself and pass ISO strings. Assume timezone Asia/Singapore (UTC+8). If the date is omitted, default to TOMORROW at the requested time. If the parsed time would be in the past, bump it to tomorrow at the same time. Preserve a sensible duration (60 minutes) if end time is missing.\n\nOtherwise, reply naturally in PLAIN TEXT (no markdown, no lists). Keep replies concise (1–2 sentences) and conversational.",
    },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.text })),
    { role: "user" as const, content: message },
  ];

  const tools: any = [
    {
      type: "function",
      function: {
        name: "add_property_from_url",
        description: "Import a listing by URL (PropertyGuru or 99.co)",
        parameters: {
          type: "object",
          properties: { url: { type: "string", description: "Listing URL" } },
          required: ["url"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_properties",
        description: "List the user's recent properties",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "top_prospects",
        description: "Show the user's top prospects",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "draft_whatsapp",
        description: "Draft a short WhatsApp message",
        parameters: {
          type: "object",
          properties: { instruction: { type: "string" } },
          required: ["instruction"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_appointment",
        description: "Create an appointment in the app, and also in Google Calendar if connected",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Meeting title" },
            description: { type: "string" },
            startTime: { type: "string", description: "ISO start time" },
            endTime: { type: "string", description: "ISO end time" },
            inviteeName: { type: "string" },
            inviteeEmail: { type: "string" },
            inviteePhone: { type: "string" },
          },
          required: ["startTime", "endTime"],
        },
      },
    },
      {
        type: "function",
        function: {
          name: "list_todays_schedule",
          description: "List the user's appointments for a specific date. Accepts 'today', 'tomorrow', or an ISO date string (YYYY-MM-DD). If the user asks about schedule, meetings, or availability without specifying a date, default to 'today'.",
          parameters: {
            type: "object",
            properties: {
              date: {
                type: "string",
                description: "The date to check: 'today', 'tomorrow', or ISO date string (YYYY-MM-DD). Defaults to 'today' if not provided.",
              },
            },
          },
        },
      },
    {
      type: "function",
      function: {
        name: "build_schedule_link",
        description: "Build a shareable schedule page link with optional prefill (name/email/phone)",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
          },
        },
      },
    },
  ];

  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: msgs as any,
    tools,
    temperature: 0.5,
    max_tokens: 300,
  });

  const msg: any = r.choices?.[0]?.message || {};
  const toolCalls = msg.tool_calls || msg.tool_calls; // safeguard
  if (toolCalls && toolCalls.length > 0) {
    const call = toolCalls[0];
    const name = call.function?.name as string;
    let args: any = {};
    try {
      args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
    } catch {
      args = {};
    }
    return { action: "tool", tool: name as any, args };
  }
  const content = (msg.content || "").toString().trim();
  if (content) return { action: "respond", reply: content };
  return { action: "respond", reply: "I can help with properties and prospects. What would you like to do?" };
}

export async function draftWhatsAppReply(
  history: Array<{ role: "user" | "assistant"; text: string }>,
  instruction: string
): Promise<string> {
  const client = getClient();
  const msgs = [
    {
      role: "system" as const,
      content:
        "Draft a concise, friendly WhatsApp message for a property rental context. Keep it under 80 words and professional.",
    },
    ...history.slice(-4).map((m) => ({ role: m.role, content: m.text })),
    { role: "user" as const, content: instruction },
  ];
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: msgs as any,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 160,
  });
  return r.choices?.[0]?.message?.content?.trim() || "";
}




export async function planSetupStep(
  history: Array<{ role: "user" | "assistant"; text: string }>,
  message: string
): Promise<ToolPlan> {
  const client = getClient();
  const msgs = [
    {
      role: "system" as const,
      content:
        "You are an onboarding assistant helping an agent finish setup. If the user asks what to do next, call setup_checklist. If they want to configure screening questions, call setup_save_questionnaire with fields. If they ask to connect Google Calendar, call setup_google_auth_link. If they share or ask to set Calendly, call setup_set_calendly_url with url. If they share a PropertyGuru or 99.co link, call add_property_from_url. If they want a booking link, call share_booking_link. If they say they are done, call finalize_setup. Otherwise reply helpfully in plain text (no markdown).",
    },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.text })),
    { role: "user" as const, content: message },
  ];

  const tools: any = [
    { type: "function", function: { name: "setup_checklist", description: "Summarize remaining setup steps", parameters: { type: "object", properties: {} } } },
    { type: "function", function: { name: "setup_save_questionnaire", description: "Save default screening questions", parameters: { type: "object", properties: { fields: { type: "array", items: { type: "object" } } } } } },
    { type: "function", function: { name: "setup_google_auth_link", description: "Get Google OAuth link for Calendar", parameters: { type: "object", properties: {} } } },
    { type: "function", function: { name: "setup_set_calendly_url", description: "Save Calendly URL", parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } },
    { type: "function", function: { name: "add_property_from_url", description: "Import a listing by URL (PropertyGuru or 99.co)", parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } },
    { type: "function", function: { name: "share_booking_link", description: "Build a booking link with optional prefill", parameters: { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" } } } } },
    { type: "function", function: { name: "finalize_setup", description: "Mark onboarding complete if core steps met", parameters: { type: "object", properties: {} } } },
  ];

  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: msgs as any,
    tools,
    temperature: 0.2,
    max_tokens: 300,
  });

  const msg: any = r.choices?.[0]?.message || {};
  const toolCalls = msg.tool_calls || msg.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    const call = toolCalls[0];
    const name = call.function?.name as string;
    let args: any = {};
    try { args = call.function?.arguments ? JSON.parse(call.function.arguments) : {}; } catch { args = {}; }
    return { action: "tool", tool: name as any, args };
  }
  const content = (msg.content || "").toString().trim();
  if (content) return { action: "respond", reply: content };
  return { action: "respond", reply: "Let’s continue setup. Would you like me to show what’s left?" };
}

// Lead-focused planner and responder
export async function planLeadStep(
  history: Array<{ role: "user" | "assistant"; text: string }>,
  message: string
): Promise<ToolPlan> {
  try {
    const client = getClient();
    const msgs = [
      {
        role: "system" as const,
        content:
          "You are a WhatsApp lead concierge for property rentals. Decide whether to call a function tool or reply directly. If the user shares a PropertyGuru or 99.co URL in THIS message or recent history, ALWAYS call add_property_from_url with that URL (do not reply first). If they ask about the property (price, size, bedrooms, furnishing, availability, location), call get_property_details to load context before replying. If they want to view, call propose_viewing_slots to get options, and if they confirm a slot, call book_viewing. NEVER claim you cannot open links; you can process URLs provided by the user. Replies must be plain text, natural, concise, warm.",
      },
      ...history.slice(-8).map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: message },
    ];

    const tools: any = [
      { type: "function", function: { name: "add_property_from_url", description: "Import a listing by URL (PropertyGuru or 99.co)", parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } },
      { type: "function", function: { name: "get_property_details", description: "Fetch details for the current property in context", parameters: { type: "object", properties: { propertyId: { type: "string" } } } } },
      { type: "function", function: { name: "propose_viewing_slots", description: "Get a couple of good viewing time options", parameters: { type: "object", properties: {} } } },
      { type: "function", function: { name: "book_viewing", description: "Book a viewing with start and end time ISO strings", parameters: { type: "object", properties: { startTime: { type: "string" }, endTime: { type: "string" }, title: { type: "string" }, inviteeName: { type: "string" }, inviteeEmail: { type: "string" }, inviteePhone: { type: "string" } }, required: ["startTime", "endTime"] } } },
    ];

    const r = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: msgs as any,
      tools,
      temperature: 0.2,
      max_tokens: 300,
    });

    const msg: any = r.choices?.[0]?.message || {};
    const toolCalls = msg.tool_calls || msg.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const call = toolCalls[0];
      const name = call.function?.name as string;
      let args: any = {};
      try { args = call.function?.arguments ? JSON.parse(call.function.arguments) : {}; } catch { args = {}; }
      return { action: "tool", tool: name as any, args };
    }
    const content = (msg.content || "").toString().trim();
    if (content) return { action: "respond", reply: content };
    return { action: "respond", reply: "Thanks for reaching out. How can I help with your rental search?" };
  } catch {
    return { action: "respond", reply: "Thanks for reaching out. How can I help with your rental search?" };
  }
}

export async function leadReply(
  history: Array<{ role: "user" | "assistant"; text: string }>,
  message: string,
  context: any
): Promise<string> {
  try {
    const client = getClient();
    const msgs = [
      {
        role: "system" as const,
        content:
          "You are a human‑sounding WhatsApp rental assistant for a property agent. Use ONLY plain text. Be warm and concise. Prefer contractions. Avoid corporate phrasing and templates.\n\nHard rules:\n- Never say you can't open or access links. If a URL is provided, acknowledge it succinctly (e.g., 'Got the link') and continue.\n\nRules using the provided Context JSON:\n- If 'askAllAtOnce' is true and 'screeningFields' are present, ask ALL the screening questions together in a numbered list format. Make it conversational: 'I'd love to help! Quick questions: 1) Budget? 2) Move-in date? 3) Employment?'\n- If 'remainingFields' are present, remind them which questions still need answers.\n- If 'screeningComplete' is true, acknowledge completion and offer to help further.\n- If needPropertyLink is true or no property is in context, ask for the PropertyGuru or 99.co link, or the listing name/address, in one short sentence. Offer an alternative: ask for area, bedrooms and budget so you can suggest options.\n- If offeredSlots are present, present exactly two as 'Saturday 3 PM' and 'Sunday 11 AM' style and ask which works.\n- If facts or property are present, answer naturally using those details.\n- If unsure, ask one short clarifying question that moves the rental conversation forward.",
      },
      { role: "system" as const, content: `Context JSON:\n${JSON.stringify(context || {}, null, 2)}` },
      ...history.slice(-6).map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: message },
    ];
    const r = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: msgs as any,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 220,
    });
    return r.choices?.[0]?.message?.content?.trim() || "Happy to help.";
  } catch (error) {
    console.error("[leadReply] Error:", error);
    return "Happy to help.";
  }
}

// Extract structured answers for screening fields from free‑text replies
export async function extractScreeningAnswers(
  history: Array<{ role: "user" | "assistant"; text: string }>,
  message: string,
  fields: Array<{ id: string; label: string }>
): Promise<Record<string, string>> {
  try {
    const client = getClient();
    const fieldList = fields.map((f) => `${f.id}:${f.label}`).join("\n");
    const msgs = [
      {
        role: "system" as const,
        content:
          "Extract values for the requested fields from the user's last reply and brief history. Return STRICT JSON: { fieldId: value }. If a value is not present, omit that key. Normalize values to short phrases (e.g., '2 bedrooms', 'S$4500', 'August 2025').",
      },
      { role: "system" as const, content: `Fields to extract (id:label):\n${fieldList}` },
      ...history.slice(-6).map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: message },
    ];
    const r = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: msgs as any,
      temperature: 0,
      max_tokens: 150,
      response_format: { type: "json_object" } as any,
    });
    const text = r.choices?.[0]?.message?.content || "{}";
    try { return JSON.parse(text); } catch { return {}; }
  } catch {
    return {};
  }
}

