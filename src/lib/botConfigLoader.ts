import { db } from "@/lib/db";
import { botConfigs } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { AutomationConfig, AutomationConfigSchema } from "./botConfigParser";

/**
 * Load the active automation config with hierarchy:
 * Priority: Client-specific > Property-specific > Global
 */
export async function loadAutomationConfig(
  userId: string,
  options?: {
    clientId?: string;
    propertyId?: string;
  }
): Promise<AutomationConfig | null> {
  try {
    // 1. Try client-specific config (highest priority)
    if (options?.clientId) {
      const clientConfigs = await db
        .select()
        .from(botConfigs)
        .where(
          and(
            eq(botConfigs.userId, userId),
            eq(botConfigs.clientId, options.clientId),
            eq(botConfigs.scope, "client"),
            eq(botConfigs.isActive, true)
          )
        )
        .limit(1);

      if (clientConfigs.length > 0) {
        const config = clientConfigs[0];
        const parsed = typeof config.parsedConfig === "string"
          ? JSON.parse(config.parsedConfig)
          : config.parsedConfig;
        return AutomationConfigSchema.parse(parsed);
      }
    }

    // 2. Try property-specific config (medium priority)
    if (options?.propertyId) {
      const propertyConfigs = await db
        .select()
        .from(botConfigs)
        .where(
          and(
            eq(botConfigs.userId, userId),
            eq(botConfigs.propertyId, options.propertyId),
            eq(botConfigs.scope, "property"),
            eq(botConfigs.isActive, true)
          )
        )
        .limit(1);

      if (propertyConfigs.length > 0) {
        const config = propertyConfigs[0];
        const parsed = typeof config.parsedConfig === "string"
          ? JSON.parse(config.parsedConfig)
          : config.parsedConfig;
        return AutomationConfigSchema.parse(parsed);
      }
    }

    // 3. Fall back to global config (lowest priority)
    // Use the NEWEST config (DESC order) not the oldest
    const globalConfigs = await db
      .select()
      .from(botConfigs)
      .where(
        and(
          eq(botConfigs.userId, userId),
          eq(botConfigs.scope, "global"),
          eq(botConfigs.isActive, true)
        )
      )
      .orderBy(desc(botConfigs.createdAt))
      .limit(1);

    if (globalConfigs.length > 0) {
      const config = globalConfigs[0];
      const parsed = typeof config.parsedConfig === "string"
        ? JSON.parse(config.parsedConfig)
        : config.parsedConfig;
      
      console.log('[botConfigLoader] Loaded global config:', {
        id: config.id,
        name: config.name,
        hasPhaseSettings: !!parsed.phaseSettings,
        screeningQuestions: parsed.phaseSettings?.screening?.questions?.length || 0
      });
      
      return AutomationConfigSchema.parse(parsed);
    }

    console.log('[botConfigLoader] No config found, using defaults');
    return null;
  } catch (error) {
    console.error("[botConfigLoader] Error loading automation config:", error);
    return null;
  }
}

/**
 * Default automation config if none is set
 */
export function getDefaultAutomationConfig(): AutomationConfig {
  return {
    automatedPhases: [
      "screening",
      "property_detection",
      "property_qa",
      "viewing_proposal",
      "viewing_booking",
    ],
    maxPhase: "viewing_booking",
    requireApproval: {
      beforeScreening: false,
      beforePropertyAdd: false,
      beforeViewingProposal: false,
      beforeViewingBooking: false,
    },
    behavior: {
      tone: "professional",
      responseSpeed: "instant",
      autoFollowUp: true,
    },
  };
}

