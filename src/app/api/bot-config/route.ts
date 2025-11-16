import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botConfigs, users } from "@/lib/db";
import { auth as clerkAuth, clerkClient } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { parseAutomationInstructions } from "@/lib/botConfigParser";

/**
 * GET /api/bot-config
 * Fetch all bot configurations for the current user
 * Optional query params:
 *  - clientId: get config for a specific client
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await clerkAuth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    let query;
    if (clientId) {
      // Get client-specific config or fallback to global
      query = db
        .select()
        .from(botConfigs)
        .where(
          and(
            eq(botConfigs.userId, userId),
            eq(botConfigs.isActive, true)
          )
        )
        .orderBy(botConfigs.createdAt);
    } else {
      // Get all configs for this user
      query = db
        .select()
        .from(botConfigs)
        .where(
          and(
            eq(botConfigs.userId, userId),
            eq(botConfigs.isActive, true)
          )
        )
        .orderBy(botConfigs.createdAt);
    }

    const configs = await query;

    // If requesting for a specific client, prioritize client-specific config
    if (clientId && configs.length > 0) {
      const clientSpecific = configs.find(c => c.clientId === clientId);
      const global = configs.find(c => c.clientId === null);
      return NextResponse.json({
        config: clientSpecific || global,
        all: configs,
      });
    }

    return NextResponse.json({ configs });
  } catch (error) {
    console.error("Error fetching bot configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch configurations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bot-config
 * Create or update a bot configuration
 * Body: {
 *   name: string,
 *   naturalLanguageInput: string,
 *   clientId?: string (optional, for client-specific rules)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await clerkAuth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists in local database (for foreign key)
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existingUser.length === 0) {
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || `user-${userId}@example.com`;
        const name = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || clerkUser.username || email;
        
        await db.insert(users).values({
          id: userId,
          email,
          name,
          image: clerkUser.imageUrl,
          role: 'agent',
        });
        console.log('[bot-config API] Created user:', userId);
      } catch (userError) {
        console.error('[bot-config API] Failed to create user:', userError);
      }
    }

    const body = await req.json();
    const { name, naturalLanguageInput, parsedConfig: providedConfig, clientId, id, scope } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Use provided config or parse natural language
    let parsedConfig;
    if (providedConfig) {
      // Config already parsed (from visual editor)
      parsedConfig = providedConfig;
    } else if (naturalLanguageInput) {
      // Parse natural language (from text editor)
      parsedConfig = await parseAutomationInstructions(naturalLanguageInput);
    } else {
      return NextResponse.json(
        { error: "Either naturalLanguageInput or parsedConfig is required" },
        { status: 400 }
      );
    }

    if (id) {
      // Update existing config
      const updated = await db
        .update(botConfigs)
        .set({
          name,
          naturalLanguageInput,
          parsedConfig: JSON.stringify(parsedConfig),
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(botConfigs.id, id),
            eq(botConfigs.userId, userId)
          )
        )
        .returning();

      return NextResponse.json({ config: updated[0] });
    } else {
      // Create new config
      console.log('[bot-config API] Creating with values:', {
        userId,
        clientId: clientId || null,
        propertyId: body.propertyId || null,
        scope: scope || 'global',
        name,
        naturalLanguageInput: naturalLanguageInput || 'Visual configuration',
        parsedConfigLength: JSON.stringify(parsedConfig).length,
      });

      const newConfig = await db
        .insert(botConfigs)
        .values({
          userId: userId,
          clientId: clientId || null,
          propertyId: body.propertyId || null,
          scope: scope || 'global',
          name,
          naturalLanguageInput: naturalLanguageInput || 'Visual configuration',
          parsedConfig: JSON.stringify(parsedConfig),
        })
        .returning();
      
      console.log('[bot-config API] Created successfully:', newConfig[0]?.id);

      return NextResponse.json({ config: newConfig[0] });
    }
  } catch (error: any) {
    console.error("Error saving bot config:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save configuration", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bot-config/:id
 * Delete (deactivate) a bot configuration
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await clerkAuth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Configuration ID is required" },
        { status: 400 }
      );
    }

    await db
      .update(botConfigs)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(botConfigs.id, id),
          eq(botConfigs.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bot config:", error);
    return NextResponse.json(
      { error: "Failed to delete configuration" },
      { status: 500 }
    );
  }
}

