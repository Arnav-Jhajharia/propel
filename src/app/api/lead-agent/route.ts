import { NextResponse } from "next/server";
import { z } from "zod";
import { runLeadAgent } from "@/agent/leadGraph";
import { getSession } from "@/lib/simple-auth";

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
  clientId: z.string().optional(), // Optional client identifier for state persistence
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { message, history, clientId } = BodySchema.parse(json);

    // Identify user via simple auth; fallback anonymous
    let userId = "anonymous";
    try {
      const cookieHeader = req.headers.get("cookie") || "";
      const token = cookieHeader.split("session-token=")[1]?.split(";")[0];
      if (token) {
        const session = await getSession(token);
        if (session?.user?.id) userId = session.user.id;
      }
    } catch {}

    // Use Dedalus agent if enabled, otherwise fallback to LangGraph
    const useDedalus = process.env.LLM_PROVIDER === "dedalus";
    
    if (useDedalus) {
      const dedalusUrl = process.env.DEDALUS_BRIDGE_URL || "http://localhost:8001";
      try {
        const response = await fetch(`${dedalusUrl}/v1/agents/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: message,
            userId,
            agent_type: "lead",
            history: history?.map((h) => ({ role: h.role, text: h.text })),
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ 
            ok: true, 
            reply: data.output || "",
            data: data.tool_calls ? { tool_calls: data.tool_calls } : undefined
          });
        }
      } catch (err) {
        console.error("Dedalus lead agent error:", err);
        // Fallback to LangGraph on error
      }
    }
    
    // Fallback to LangGraph agent
    // Try to load persisted state if we have a way to identify the client
    const { runLeadAgent } = await import("@/agent/leadGraph");
    const { loadLeadState, saveLeadState } = await import("@/lib/lead-state-persistence");
    
    // Load persisted state if we have a client identifier
    // clientId could be a phone number, conversation ID, or other unique identifier
    let persistedState = null;
    if (clientId && clientId !== userId && clientId !== "anonymous") {
      try {
        persistedState = await loadLeadState(userId, clientId);
      } catch (err) {
        // Ignore errors - state loading is best effort
      }
    }
    
    const result = await runLeadAgent({ userId, message, history }, persistedState || undefined);
    
    // Save state if we have a client identifier
    if (result.state && clientId && clientId !== userId && clientId !== "anonymous") {
      try {
        await saveLeadState(userId, clientId, result.state);
      } catch (err) {
        // Ignore errors - state saving is best effort
      }
    }
    
    return NextResponse.json(result);
  } catch (err: any) {
    const msg = err?.message || "Unexpected error";
    return NextResponse.json({ ok: false, reply: msg }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";





