import { NextResponse } from "next/server";
import { db, botConfigs } from "@/lib/db";
import { eq } from "drizzle-orm";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import { getSession } from "@/lib/simple-auth";

export async function GET(req: Request) {
  try {
    // Get userId
    let userId = "anonymous";
    try {
      const { userId: clerkUserId } = await clerkAuth();
      if (clerkUserId) userId = clerkUserId;
    } catch {}
    
    if (userId === "anonymous") {
      try {
        const cookieHeader = req.headers.get("cookie") || "";
        const token = cookieHeader.split("session-token=")[1]?.split(";")[0];
        if (token) {
          const session = await getSession(token);
          if (session?.user?.id) userId = session.user.id;
        }
      } catch {}
    }

    const configs = await db
      .select()
      .from(botConfigs)
      .where(eq(botConfigs.userId, userId))
      .limit(5);

    const debugInfo = configs.map(config => {
      const parsed = typeof config.parsedConfig === "string"
        ? JSON.parse(config.parsedConfig)
        : config.parsedConfig;
      
      return {
        id: config.id,
        name: config.name,
        scope: config.scope,
        isActive: config.isActive,
        questionCount: parsed?.phaseSettings?.screening?.questions?.length || 0,
        questions: parsed?.phaseSettings?.screening?.questions || [],
        openingMessage: parsed?.phaseSettings?.screening?.openingMessage || null,
        fullConfig: parsed
      };
    });

    return NextResponse.json({
      userId,
      database: process.env.DATABASE_URL?.includes('supabase') ? 'Supabase' : 
                process.env.DATABASE_URL?.includes('turso') ? 'Turso' :
                process.env.DATABASE_URL?.includes('file:') ? 'SQLite' : 'Unknown',
      configs: debugInfo
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

