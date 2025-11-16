import { NextResponse } from "next/server";
import { z } from "zod";
import { runLeadAgent, clearCache } from "@/agent/leadGraph";
import { getSession } from "@/lib/simple-auth";
import { loadLeadState, saveLeadState } from "@/lib/lead-state-persistence";
import { auth as clerkAuth } from "@clerk/nextjs/server";

const BodySchema = z.object({
  message: z.string().min(1, "message is required"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string(),
      })
    )
    .max(30)
    .optional(),
  clientPhone: z.string().optional(), // For state persistence
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { message, history, clientPhone } = BodySchema.parse(json);
    
    // FORCE GRAPH RECOMPILE IN DEVELOPMENT
    if (process.env.NODE_ENV === 'development') {
      clearCache();
    }

    // Identify user via Clerk or simple auth; fallback anonymous
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

    // Use a demo phone for testing if not provided
    const testPhone = clientPhone || `demo-${userId}`;

    // Load persisted state for this conversation
    const persistedState = await loadLeadState(userId, testPhone);

    console.log("[lead-agent] ===== REQUEST DEBUG =====");
    console.log("[lead-agent] userId:", userId);
    console.log("[lead-agent] testPhone:", testPhone);
    console.log("[lead-agent] messagePreview:", message.substring(0, 50));
    console.log("[lead-agent] hasPersistedState:", !!persistedState);
    console.log("[lead-agent] persistedState:", JSON.stringify(persistedState, null, 2));
    console.log("[lead-agent] history length:", history?.length || 0);

    // Call lead agent with persisted state
    const result = await runLeadAgent(
      { userId, message, history },
      persistedState || undefined
    );

    console.log("[lead-agent] ===== RESPONSE DEBUG =====");
    console.log("[lead-agent] ok:", result.ok);
    console.log("[lead-agent] reply:", result.reply);
    console.log("[lead-agent] hasState:", !!result.state);
    console.log("[lead-agent] state:", JSON.stringify(result.state, null, 2));

    // Save updated state back to database
    if (result.state) {
      await saveLeadState(userId, testPhone, result.state);
      console.log("[lead-agent] State saved for", testPhone);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[lead-agent] ERROR:", err);
    const msg = err?.message || "Unexpected error";
    return NextResponse.json({ ok: false, reply: msg }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";





