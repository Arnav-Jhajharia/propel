import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function DELETE(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== true) {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    }

    // remove local row
    try { await db.delete(users).where(eq(users.id, userId)); } catch {}

    // delete clerk user
    await clerkClient.users.deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delete account error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";








