import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clients, prospects, properties } from "@/lib/db/schema";
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

    // Deduplicate by clientId - keep the prospect with highest score (or most recent if scores are equal)
    const seen = new Map<string, typeof rows[0]>();
    for (const row of rows) {
      const existing = seen.get(row.clientId);
      if (!existing) {
        seen.set(row.clientId, row);
      } else {
        // Keep the one with higher score, or if equal, the more recent one
        const existingTime = existing.lastMessageAt ? new Date(existing.lastMessageAt).getTime() : 0;
        const currentTime = row.lastMessageAt ? new Date(row.lastMessageAt).getTime() : 0;
        if (row.score > existing.score || (row.score === existing.score && currentTime > existingTime)) {
          seen.set(row.clientId, row);
        }
      }
    }

    // Convert back to array and sort by score
    const unique = Array.from(seen.values()).sort((a, b) => b.score - a.score);

    return NextResponse.json({ prospects: unique });
  } catch (error) {
    console.error("Error fetching prospects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


