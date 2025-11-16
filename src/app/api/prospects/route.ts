import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, clients, prospects, properties } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For now, data is global; in future, filter by agent (userId) if columns exist
    const rows = await db
      .select({
        id: prospects.id,
        score: prospects.score,
        summary: prospects.summary,
        lastMessageAt: prospects.lastMessageAt,
        status: prospects.status,
        clientId: clients.id,
        clientName: clients.name,
        clientPhone: clients.phone,
        clientAvatar: clients.avatar,
        propertyId: properties.id,
        propertyTitle: properties.title,
      })
      .from(prospects)
      .innerJoin(clients, eq(prospects.clientId, clients.id))
      .innerJoin(properties, eq(prospects.propertyId, properties.id))
      .orderBy(desc(prospects.score));

    return NextResponse.json({ prospects: rows });
  } catch (error) {
    console.error("Error fetching prospects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


