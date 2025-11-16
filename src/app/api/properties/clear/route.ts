import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, conversations, properties, prospects } from "@/lib/db/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

export async function POST() {
  try {
    // Unprotected: clears ALL properties across the database (dev utility)
    const rows = await db.select({ id: properties.id }).from(properties);
    const ids = rows.map((r) => r.id as string);
    if (ids.length === 0) return NextResponse.json({ ok: true, removed: 0 });

    await db.delete(prospects).where(inArray(prospects.propertyId, ids));
    await db.delete(appointments).where(inArray(appointments.propertyId, ids));
    await db
      .update(conversations)
      .set({ propertyId: null })
      .where(and(inArray(conversations.propertyId, ids), isNotNull(conversations.propertyId)) as any);

    await db.delete(properties).where(inArray(properties.id, ids));

    return NextResponse.json({ ok: true, removed: ids.length });
  } catch (error) {
    console.error("clear properties error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

