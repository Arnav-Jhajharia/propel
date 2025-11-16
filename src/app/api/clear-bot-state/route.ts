import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversationStates } from "@/lib/db";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import { getSession } from "@/lib/simple-auth";
import { eq, and } from "drizzle-orm";

async function clearState(req: Request) {
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

    // Get optional clientPhone from request body
    let clientPhone: string | undefined;
    try {
      const body = await req.json();
      clientPhone = body?.clientPhone;
    } catch {}

    // Delete conversation states - either for specific client or all
    if (clientPhone) {
      // Clear specific client's conversation
      await db
        .delete(conversationStates)
        .where(
          and(
            eq(conversationStates.userId, userId),
            eq(conversationStates.clientPhone, clientPhone)
          )
        );

      return NextResponse.json({ 
        ok: true, 
        message: `Conversation cleared for ${clientPhone}` 
      }, { status: 200 });
    } else {
      // Clear all conversations for this user
      await db
        .delete(conversationStates)
        .where(eq(conversationStates.userId, userId));

      return NextResponse.json({ 
        ok: true, 
        message: "All bot conversation states cleared. Fresh start!" 
      }, { status: 200 });
    }
  } catch (error: any) {
    console.error("[clear-bot-state] Error:", error);
    return NextResponse.json({ 
      ok: false,
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Clear persisted bot conversation state
 * This is useful when you update bot configuration and want to reset all conversations
 */
export const POST = clearState;
export const GET = clearState;

export const dynamic = "force-dynamic";

