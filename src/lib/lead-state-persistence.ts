import { db, conversationStates } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

/**
 * Lead graph state that should be persisted between conversations
 */
export type PersistedLeadState = {
  propertyId?: string;
  propertyTitle?: string;
  propertyUrl?: string;
  screeningFields?: Array<{ id: string; label: string; prompt?: string }>;
  screeningAnswers?: Record<string, string>;
  screeningComplete?: boolean;
  offeredSlots?: string[];
};

/**
 * Save lead graph state to database
 */
export async function saveLeadState(
  userId: string,
  clientPhone: string,
  state: PersistedLeadState
): Promise<void> {
  try {
    // Find existing state
    const existing = await db
      .select()
      .from(conversationStates)
      .where(
        and(
          eq(conversationStates.userId, userId),
          eq(conversationStates.clientPhone, clientPhone),
          eq(conversationStates.status, "active")
        )
      )
      .limit(1);

    const stateData = {
      propertyId: state.propertyId || null,
      answers: JSON.stringify({
        screeningAnswers: state.screeningAnswers || {},
        screeningFields: state.screeningFields || [],
        screeningComplete: state.screeningComplete || false,
        propertyTitle: state.propertyTitle,
        propertyUrl: state.propertyUrl,
        offeredSlots: state.offeredSlots || [],
      }),
      status: state.screeningComplete ? "completed" : "active",
    };

    if (existing.length > 0) {
      // Update existing state
      await db
        .update(conversationStates)
        .set({
          ...stateData,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(conversationStates.id, existing[0].id));
    } else {
      // Create new state
      await db.insert(conversationStates).values({
        userId,
        clientPhone,
        ...stateData,
      });
    }
  } catch (error) {
    console.error("Error saving lead state:", error);
    // Don't throw - state persistence is best effort
  }
}

/**
 * Load lead graph state from database
 */
export async function loadLeadState(
  userId: string,
  clientPhone: string
): Promise<PersistedLeadState | null> {
  try {
    const states = await db
      .select()
      .from(conversationStates)
      .where(
        and(
          eq(conversationStates.userId, userId),
          eq(conversationStates.clientPhone, clientPhone),
          eq(conversationStates.status, "active")
        )
      )
      .orderBy(desc(conversationStates.updatedAt))
      .limit(1);

    if (states.length === 0) {
      return null;
    }

    const state = states[0];
    let answers: any = {};
    try {
      answers =
        typeof state.answers === "string"
          ? JSON.parse(state.answers as any)
          : state.answers || {};
    } catch {
      answers = {};
    }

    return {
      propertyId: state.propertyId || undefined,
      propertyTitle: answers.propertyTitle,
      propertyUrl: answers.propertyUrl,
      screeningFields: answers.screeningFields || [],
      screeningAnswers: answers.screeningAnswers || {},
      screeningComplete: answers.screeningComplete || false,
      offeredSlots: answers.offeredSlots || [],
    };
  } catch (error) {
    console.error("Error loading lead state:", error);
    return null;
  }
}

/**
 * Extract persisted state from lead graph result
 */
export function extractPersistedState(result: any): PersistedLeadState {
  return {
    propertyId: result.propertyId,
    propertyTitle: result.propertyTitle,
    propertyUrl: result.propertyUrl,
    screeningFields: result.screeningFields,
    screeningAnswers: result.screeningAnswers,
    screeningComplete: result.screeningComplete,
    offeredSlots: result.offeredSlots,
  };
}

