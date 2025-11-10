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
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { message, history } = BodySchema.parse(json);

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

    const result = await runLeadAgent({ userId, message, history });
    return NextResponse.json(result);
  } catch (err: any) {
    const msg = err?.message || "Unexpected error";
    return NextResponse.json({ ok: false, reply: msg }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";





