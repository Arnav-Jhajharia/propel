import { NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || null;
    const pm: any = user.privateMetadata || {};

    return NextResponse.json({
      id: user.id,
      email: primaryEmail,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || primaryEmail,
      image: user.imageUrl,
      role: 'agent',
      whatsappToken: pm.whatsappToken ?? null,
      whatsappPhoneId: pm.whatsappPhoneId ?? null,
      whatsappConnectedAt: pm.whatsappConnectedAt ?? null,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const rawName: string = (body?.name ?? "").toString().trim();
    if (!rawName) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const [firstName, ...rest] = rawName.split(" ").filter(Boolean);
    const lastName = rest.join(" ") || undefined;

    // Update in Clerk (source of truth for profile)
    await clerkClient.users.updateUser(userId, {
      firstName,
      lastName,
    });

    // Best-effort: keep local DB in sync if a row exists
    try {
      await db.update(users).set({ name: rawName }).where(eq(users.id, userId));
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
