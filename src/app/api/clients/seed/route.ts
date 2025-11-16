import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const demo = [
      {
        name: "Marcus Lee",
        phone: "6592222222",
        email: "marcus.lee@example.com",
        avatar:
          "https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=400&auto=format&fit=crop",
        score: 81,
        budget: "$5,500",
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        tenantCount: 1,
        hasPets: true,
        notes: "Has a cat, needs pet-friendly place",
        status: "active",
      },
      {
        name: "Ava Tan",
        phone: "6591111111",
        email: "ava.tan@example.com",
        avatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop",
        score: 92,
        budget: "$7,000",
        moveInDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        tenantCount: 2,
        hasPets: false,
        notes: "Looking for modern condo, flexible on location",
        status: "active",
      },
      {
        name: "Priya Sharma",
        phone: "6593333333",
        email: "priya.sharma@example.com",
        avatar:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop",
        score: 75,
        budget: "$6,000",
        moveInDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        tenantCount: 3,
        hasPets: false,
        notes: "Family with 2 kids, needs 3BR",
        status: "active",
      },
    ];

    // Filter out any that already exist by unique phone
    const phones = demo.map((d) => d.phone);
    const existing = await db.select({ phone: clients.phone }).from(clients).where(inArray(clients.phone, phones));
    const existingSet = new Set(existing.map((e) => e.phone));
    const toInsert = demo.filter((d) => !existingSet.has(d.phone));

    let inserted: any[] = [];
    if (toInsert.length > 0) {
      inserted = await db.insert(clients).values(toInsert).returning();
    }

    return NextResponse.json({ insertedCount: inserted.length, inserted });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to seed clients" }, { status: 500 });
  }
}


