import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { properties, prospects, clients, appointments } from "@/lib/db/schema";
import { eq, and, like, desc } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { propertyName, day, time } = await req.json();
    
    if (!propertyName) {
      return NextResponse.json({ error: "propertyName is required" }, { status: 400 });
    }

    // Find property by name (case-insensitive partial match)
    const propertyRows = await db
      .select()
      .from(properties)
      .where(like(properties.title, `%${propertyName}%`))
      .limit(1);

    if (propertyRows.length === 0) {
      return NextResponse.json({ error: `Property with name containing "${propertyName}" not found` }, { status: 404 });
    }

    const property = propertyRows[0];

    // Find a prospect for this property
    const prospectRows = await db
      .select({
        prospectId: prospects.id,
        clientId: prospects.clientId,
        clientName: clients.name,
        clientPhone: clients.phone,
      })
      .from(prospects)
      .innerJoin(clients, eq(prospects.clientId, clients.id))
      .where(eq(prospects.propertyId, property.id))
      .orderBy(desc(prospects.score))
      .limit(1);

    if (prospectRows.length === 0) {
      return NextResponse.json({ error: `No prospects found for property "${property.title}"` }, { status: 404 });
    }

    const prospect = prospectRows[0];

    // Calculate Saturday 3 PM in Singapore time
    const now = new Date();
    const saturday = new Date(now);
    
    // Find next Saturday
    const currentDay = saturday.getDay(); // 0 = Sunday, 6 = Saturday
    let daysUntilSaturday = 6 - currentDay;
    if (daysUntilSaturday <= 0) {
      daysUntilSaturday += 7; // If today is Saturday or past Saturday, get next week's Saturday
    }
    saturday.setDate(saturday.getDate() + daysUntilSaturday);
    saturday.setHours(15, 0, 0, 0); // 3 PM
    
    // Format as ISO string with Singapore timezone (+08:00)
    const year = saturday.getFullYear();
    const month = String(saturday.getMonth() + 1).padStart(2, '0');
    const day = String(saturday.getDate()).padStart(2, '0');
    const startTime = `${year}-${month}-${day}T15:00:00+08:00`;
    const endTime = `${year}-${month}-${day}T15:45:00+08:00`;

    // Check if appointment already exists
    const existing = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.propertyId, property.id),
        eq(appointments.clientId, prospect.clientId),
        eq(appointments.startTime, startTime)
      ))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ 
        message: "Viewing already exists",
        appointment: existing[0]
      });
    }

    // Create appointment
    const [appointment] = await db
      .insert(appointments)
      .values({
        userId,
        clientId: prospect.clientId,
        propertyId: property.id,
        title: `Viewing — ${property.title}`,
        eventType: "viewing",
        status: "scheduled",
        startTime,
        endTime,
        timezone: "Asia/Singapore",
        location: property.address || "TBD",
        inviteeName: prospect.clientName,
        inviteePhone: prospect.clientPhone,
      })
      .returning();

    return NextResponse.json({ 
      ok: true,
      appointment,
      property: property.title,
      client: prospect.clientName,
      time: startTime
    });
  } catch (err: any) {
    console.error("add-viewing error", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

