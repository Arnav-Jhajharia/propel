import { NextResponse } from "next/server";
import { z } from "zod";
import { runAgent } from "@/agent/graph";
import { getSession } from "@/lib/simple-auth";
import { auth as clerkAuth, clerkClient } from "@clerk/nextjs/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

const BodySchema = z.object({
  message: z.string().min(1, "message is required"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string(),
      })
    )
    .max(20)
    .optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { message, history } = BodySchema.parse(json);

    // Determine user via Clerk or simple-auth; fallback to anonymous
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

    // Ensure a local user exists for FK relations when not anonymous
    if (userId !== "anonymous") {
      const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (existing.length === 0) {
        let email = `user-${userId}@example.com`;
        let name = "Agent";
        let image: string | undefined = undefined;
        try {
          const u = await clerkClient.users.getUser(userId);
          email = u?.primaryEmailAddress?.emailAddress || email;
          name = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || u?.username || email;
          image = u?.imageUrl || undefined;
        } catch {}
        try { await db.insert(users).values({ id: userId, email, name, image, role: 'agent' }); } catch {}
      }
    }

    // Use the normal agent to handle the conversation
    const result = await runAgent({ userId, message, history });
    return NextResponse.json({ ok: true, reply: result.reply || "" });
  } catch (err: any) {
    const msg = err?.message || "Unexpected error";
    return NextResponse.json({ ok: false, reply: msg }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";


