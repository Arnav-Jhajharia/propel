import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botConfigs } from "@/lib/db";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/bot-config/debug
 * Get detailed view of all configs for debugging
 */
export async function GET() {
  try {
    const { userId } = await clerkAuth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configs = await db
      .select()
      .from(botConfigs)
      .where(eq(botConfigs.userId, userId))
      .orderBy(desc(botConfigs.createdAt));

    const detailed = configs.map(c => {
      const parsed = typeof c.parsedConfig === 'string' 
        ? JSON.parse(c.parsedConfig) 
        : c.parsedConfig;
      
      return {
        id: c.id,
        name: c.name,
        scope: c.scope,
        isActive: c.isActive,
        createdAt: c.createdAt,
        automatedPhases: parsed.automatedPhases,
        screeningQuestions: parsed.phaseSettings?.screening?.questions || [],
        screeningOpeningMessage: parsed.phaseSettings?.screening?.openingMessage || null,
        fullConfig: parsed
      };
    });

    return NextResponse.json({ configs: detailed });
  } catch (error: any) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch debug data" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

