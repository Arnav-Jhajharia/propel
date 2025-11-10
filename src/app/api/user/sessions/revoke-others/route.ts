import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const { userId, sessionId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: sessions } = await clerkClient.sessions.getSessionList({ userId });
    await Promise.all(
      sessions
        .filter((s) => s.id !== sessionId)
        .map((s) => clerkClient.sessions.revokeSession(s.id))
    );

    return NextResponse.json({ success: true, revoked: sessions.length > 0 ? sessions.length - 1 : 0 });
  } catch (err) {
    console.error("revoke other sessions error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";








