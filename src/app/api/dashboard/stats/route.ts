import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { properties, prospects, appointments, clients, conversations } from "@/lib/db/schema";
import { eq, and, gte, ne, sql, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all properties for this user
    const allProperties = await db
      .select()
      .from(properties)
      .where(eq(properties.userId, userId));

    const propertyIds = allProperties.map((p) => p.id);

    // Total properties
    const totalProperties = allProperties.length;

    // Total prospects
    const totalProspectsRows = propertyIds.length
      ? await db
          .select()
          .from(prospects)
          .where(inArray(prospects.propertyId, propertyIds))
      : [];
    const totalProspects = totalProspectsRows.length;

    // Active prospects (not converted/rejected)
    const activeProspectsRows = propertyIds.length
      ? await db
          .select()
          .from(prospects)
          .where(
            and(
              inArray(prospects.propertyId, propertyIds),
              ne(prospects.status, "converted"),
              ne(prospects.status, "rejected")
            )
          )
      : [];
    const activeProspects = activeProspectsRows.length;

    // Viewings scheduled (upcoming appointments)
    const now = new Date().toISOString();
    const upcomingViewingsRows = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          gte(appointments.startTime, now),
          ne(appointments.status, "canceled"),
          eq(appointments.eventType, "viewing")
        )
      );
    const upcomingViewings = upcomingViewingsRows.length;

    // Today's viewings
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayViewingsRows = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          gte(appointments.startTime, todayStart.toISOString()),
          sql`${appointments.startTime} <= ${todayEnd.toISOString()}`,
          ne(appointments.status, "canceled"),
          eq(appointments.eventType, "viewing")
        )
      );
    const todayViewings = todayViewingsRows.length;

    // Converted/closed deals
    const convertedRows = propertyIds.length
      ? await db
          .select()
          .from(prospects)
          .where(
            and(
              inArray(prospects.propertyId, propertyIds),
              eq(prospects.status, "converted")
            )
          )
      : [];
    const converted = convertedRows.length;

    // Active conversations
    const clientIds = propertyIds.length
      ? await db
          .select({ clientId: prospects.clientId })
          .from(prospects)
          .where(inArray(prospects.propertyId, propertyIds))
      : [];
    const uniqueClientIds = [...new Set(clientIds.map((c) => c.clientId).filter(Boolean))];
    const activeConversationsRows = uniqueClientIds.length
      ? await db
          .select()
          .from(conversations)
          .where(inArray(conversations.clientId, uniqueClientIds))
      : [];
    const activeConversations = new Set(activeConversationsRows.map((c) => c.id)).size;

    // Average property price
    const avgPrice = allProperties.length
      ? allProperties.reduce((sum, p) => sum + (p.price || 0), 0) / allProperties.length
      : 0;

    // Prospects requiring attention (budget below asking, missing info, etc.)
    // This is a simplified version - you might want to enhance this
    const attentionNeededRows = propertyIds.length
      ? await db
          .select()
          .from(prospects)
          .where(
            and(
              inArray(prospects.propertyId, propertyIds),
              sql`${prospects.score} < 70`
            )
          )
      : [];
    const attentionNeeded = attentionNeededRows.length;

    return NextResponse.json({
      stats: {
        totalProperties,
        totalProspects,
        activeProspects,
        upcomingViewings,
        todayViewings,
        converted,
        activeConversations,
        avgPropertyPrice: Math.round(avgPrice),
        attentionNeeded,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

