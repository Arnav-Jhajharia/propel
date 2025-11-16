import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pm: any = user.privateMetadata || {};
    const u = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const row = u[0] || null;

    const maskedToken = (row?.whatsappToken || pm.whatsappToken) ? "***redacted***" : null;

    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || null,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username,
        image: user.imageUrl,
      },
      preferences: pm.preferences || {},
      integrations: {
        calendlyUrl: row?.calendlyUrl ?? null,
        whatsappPhoneId: row?.whatsappPhoneId ?? pm.whatsappPhoneId ?? null,
        whatsappConnectedAt: row?.whatsappConnectedAt ?? pm.whatsappConnectedAt ?? null,
        whatsappToken: maskedToken,
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("export GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";








