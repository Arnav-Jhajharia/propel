import { z } from "zod";
import { getClient } from "@/agent/llm";

/**
 * Structured automation configuration schema
 * Defines what phases the bot should automate and how much control it has
 */
export const AutomationConfigSchema = z.object({
  // Phases that should be automated (empty = nothing automated)
  automatedPhases: z.array(
    z.enum([
      "screening",           // Ask screening questions
      "property_detection",  // Detect and add property from URL
      "property_qa",         // Answer property questions
      "viewing_proposal",    // Propose viewing slots
      "viewing_booking",     // Book the viewing
      "followup",           // Send follow-up messages
    ])
  ).default([]),

  // Maximum phase the bot can proceed to (bot stops here and hands off to human)
  maxPhase: z.enum([
    "none",                // Bot does nothing, all manual
    "screening",           // Bot only does screening
    "property_detection",  // Bot can detect properties
    "property_qa",         // Bot can answer property questions
    "viewing_proposal",    // Bot can propose viewings
    "viewing_booking",     // Bot can book viewings
    "full",               // Bot has full autonomy
  ]).default("full"),

  // Should the bot require human approval before key actions?
  requireApproval: z.object({
    beforeScreening: z.boolean().default(false),
    beforePropertyAdd: z.boolean().default(false),
    beforeViewingProposal: z.boolean().default(false),
    beforeViewingBooking: z.boolean().default(false),
  }).default({}),

  // Behavior customizations
  behavior: z.object({
    tone: z.enum(["professional", "friendly", "casual"]).default("professional"),
    responseSpeed: z.enum(["instant", "delayed", "human_like"]).default("instant"),
    autoFollowUp: z.boolean().default(true),
  }).default({}),

  // Phase-specific settings
  phaseSettings: z.object({
    screening: z.object({
      openingMessage: z.string().optional(),
      questions: z.array(z.object({
        id: z.string(),
        label: z.string(),
        prompt: z.string(),
      })).optional(),
    }).optional(),
    viewing: z.object({
      autoPropose: z.boolean().default(true), // Auto-propose after Q&A
      autoBook: z.boolean().default(false), // Auto-book without approval
      triggerAfterQA: z.boolean().default(true), // Propose after property questions
      proposalMessage: z.string().optional(),
      confirmationMessage: z.string().optional(),
    }).optional(),
    followup: z.object({
      maxAttempts: z.number().default(3),
      delayHours: z.number().default(24),
      messages: z.array(z.object({
        delay: z.number(),
        text: z.string(),
      })).optional(),
    }).optional(),
    handoff: z.object({
      message: z.string().optional(),
    }).optional(),
  }).optional(),
});

export type AutomationConfig = z.infer<typeof AutomationConfigSchema>;

/**
 * Parse natural language automation instructions into structured config
 */
export async function parseAutomationInstructions(
  naturalLanguage: string
): Promise<AutomationConfig> {
  const client = getClient();

  const systemPrompt = `You are an AI configuration parser. Convert natural language automation instructions into a structured JSON config.

Available phases (in order):
1. screening - Ask tenant screening questions (budget, move-in date, etc)
2. property_detection - Detect and add property from PropertyGuru/99.co URLs
3. property_qa - Answer questions about the property
4. viewing_proposal - Propose viewing time slots
5. viewing_booking - Confirm and book the viewing
6. followup - Send follow-up messages

Examples:

Input: "I only want the agent to handle simple screenings"
Output: {
  "automatedPhases": ["screening"],
  "maxPhase": "screening",
  "requireApproval": { "beforeScreening": false, "beforePropertyAdd": true, "beforeViewingProposal": true, "beforeViewingBooking": true },
  "behavior": { "tone": "professional", "responseSpeed": "instant", "autoFollowUp": false }
}

Input: "I want it to be completely handled by the agent"
Output: {
  "automatedPhases": ["screening", "property_detection", "property_qa", "viewing_proposal", "viewing_booking", "followup"],
  "maxPhase": "full",
  "requireApproval": { "beforeScreening": false, "beforePropertyAdd": false, "beforeViewingProposal": false, "beforeViewingBooking": false },
  "behavior": { "tone": "professional", "responseSpeed": "instant", "autoFollowUp": true }
}

Input: "Handle screening and property questions, but I want to manually propose viewings"
Output: {
  "automatedPhases": ["screening", "property_detection", "property_qa"],
  "maxPhase": "property_qa",
  "requireApproval": { "beforeScreening": false, "beforePropertyAdd": false, "beforeViewingProposal": true, "beforeViewingBooking": true },
  "behavior": { "tone": "professional", "responseSpeed": "instant", "autoFollowUp": false }
}

Input: "Automate everything but ask me before booking viewings"
Output: {
  "automatedPhases": ["screening", "property_detection", "property_qa", "viewing_proposal", "viewing_booking", "followup"],
  "maxPhase": "full",
  "requireApproval": { "beforeScreening": false, "beforePropertyAdd": false, "beforeViewingProposal": false, "beforeViewingBooking": true },
  "behavior": { "tone": "professional", "responseSpeed": "instant", "autoFollowUp": true }
}

Input: "Be friendly and casual, automate screening and property detection only"
Output: {
  "automatedPhases": ["screening", "property_detection"],
  "maxPhase": "property_detection",
  "requireApproval": { "beforeScreening": false, "beforePropertyAdd": false, "beforeViewingProposal": true, "beforeViewingBooking": true },
  "behavior": { "tone": "friendly", "responseSpeed": "instant", "autoFollowUp": false }
}

Now parse this instruction and return ONLY valid JSON (no markdown, no explanation):`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: naturalLanguage },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    // Validate with Zod
    return AutomationConfigSchema.parse(parsed);
  } catch (error) {
    console.error("Failed to parse automation instructions:", error);
    
    // Return a safe default configuration
    return {
      automatedPhases: ["screening", "property_detection", "property_qa"],
      maxPhase: "property_qa",
      requireApproval: {
        beforeScreening: false,
        beforePropertyAdd: false,
        beforeViewingProposal: true,
        beforeViewingBooking: true,
      },
      behavior: {
        tone: "professional",
        responseSpeed: "instant",
        autoFollowUp: false,
      },
    };
  }
}

/**
 * Check if a specific phase is automated based on the config
 */
export function isPhaseAutomated(
  config: AutomationConfig,
  phase: AutomationConfig["automatedPhases"][number]
): boolean {
  return config.automatedPhases.includes(phase);
}

/**
 * Check if the bot should proceed with a specific action
 * Returns false if the action exceeds maxPhase or requires approval
 */
export function shouldProceedWithPhase(
  config: AutomationConfig,
  phase: string,
  approvalKey?: keyof AutomationConfig["requireApproval"]
): boolean {
  // Check if we've exceeded max phase
  const phaseOrder = ["none", "screening", "property_detection", "property_qa", "viewing_proposal", "viewing_booking", "full"];
  const currentPhaseIndex = phaseOrder.indexOf(phase);
  const maxPhaseIndex = phaseOrder.indexOf(config.maxPhase);
  
  if (currentPhaseIndex > maxPhaseIndex) {
    return false;
  }

  // Check if approval is required
  if (approvalKey && config.requireApproval[approvalKey]) {
    return false;
  }

  return true;
}

