import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { hours } = await req.json().catch(() => ({ hours: 24 }));
    const ms = Number.isFinite(hours) ? Math.max(1, Number(hours)) * 3600_000 : 24 * 3600_000;
    const until = Date.now() + ms;

    await clerkClient.users.updateUser(userId, {
      privateMetadata: {
        onboardingSkipUntil: until,
      },
    });

    return NextResponse.json({ success: true, until });
  } catch (e) {
    return NextResponse.json({ error: "Failed to set skip" }, { status: 500 });
  }
}


