import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  properties,
  clients,
  prospects,
  conversations,
  messages,
  appointments,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fix existing phone numbers first
    try {
      const { fixPhoneNumbers } = await import("@/lib/db/fix-phone-numbers");
      await fixPhoneNumbers();
    } catch (e) {
      console.warn("Phone number fix failed:", e);
    }

    // Upsert two properties for this user
    const sampleProps = [
      {
        url: "https://www.propertyguru.com.sg/listing/demo-orchard-2br",
        title: "Modern 2BR Condo in Orchard",
        address: "12 Orchard Blvd, Singapore",
        price: 5200,
        bedrooms: 2,
        bathrooms: 2,
        sqft: 860,
        heroImage: "https://images.unsplash.com/photo-1505692794403-34d4982b671c?q=80&w=1600&auto=format&fit=crop",
        description: "Beautiful modern condo with city views",
        propertyType: "condo",
        furnished: "furnished",
        availableFrom: nowIso(7 * 24 * 60 * 60 * 1000),
      },
      {
        url: "https://www.propertyguru.com.sg/listing/demo-tiong-3br",
        title: "Spacious 3BR near Tiong Bahru",
        address: "8 Kim Tian Rd, Singapore",
        price: 6800,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1100,
        heroImage: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1600&auto=format&fit=crop",
        description: "Spacious family home in trendy neighborhood",
        propertyType: "condo",
        furnished: "unfurnished",
        availableFrom: nowIso(14 * 24 * 60 * 60 * 1000),
      },
    ];

    const ensuredProps = [] as Array<{ id: string; title: string }>;
    for (const p of sampleProps) {
      const existing = await db
        .select()
        .from(properties)
        .where(and(eq(properties.url, p.url), eq(properties.userId, userId)))
        .limit(1);
      if (existing.length > 0) {
        ensuredProps.push({ id: existing[0].id, title: existing[0].title });
      } else {
        const [ins] = await db.insert(properties).values({ ...p, userId }).returning();
        ensuredProps.push({ id: ins.id, title: ins.title });
      }
    }

    // Upsert three clients
    const sampleClients = [
      { name: "Ava Tan", phone: "6593456789", email: "ava.tan@example.com", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop" },
      { name: "Marcus Lee", phone: "6598765432", email: "marcus.lee@example.com", avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400&auto=format&fit=crop" },
      { name: "Priya Sharma", phone: "6592345678", email: "priya.sharma@example.com", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop" },
    ];
    const ensuredClients = [] as Array<{ id: string; name: string; phone: string }>;
    for (const c of sampleClients) {
      const existing = await db.select().from(clients).where(eq(clients.phone, c.phone)).limit(1);
      if (existing.length > 0) ensuredClients.push({ id: existing[0].id, name: existing[0].name, phone: existing[0].phone });
      else {
        const [ins] = await db.insert(clients).values({ ...c, score: 80, status: "active" }).returning();
        ensuredClients.push({ id: ins.id, name: ins.name, phone: ins.phone });
      }
    }

    // Link prospects to first property
    const propId = ensuredProps[0].id;
    for (const [i, c] of ensuredClients.entries()) {
      const existing = await db
        .select()
        .from(prospects)
        .where(and(eq(prospects.clientId, c.id), eq(prospects.propertyId, propId)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(prospects).values({
          clientId: c.id,
          propertyId: propId,
          score: 70 + i * 8,
          summary: i === 0 ? "Budget 7k, 2 pax, no pets." : i === 1 ? "Budget 5.5k, 1 pax, has cat." : "Budget 6k, 3 pax, no pets.",
          lastMessageAt: nowIso(-3600_000 * (i + 1)),
          status: "active",
        });
      }
    }

    // Minimal conversations/messages so stages can be computed
    for (const c of ensuredClients) {
      const existing = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.clientId, c.id)))
        .limit(1);
      let convId = existing[0]?.id as string | undefined;
      if (!convId) {
        const [conv] = await db.insert(conversations).values({ clientId: c.id, propertyId: propId, platform: "whatsapp", status: "active" }).returning();
        convId = conv.id;
      }
      // one client message to mark "replied"
      await db.insert(messages).values({ conversationId: convId, from: "client", text: "Hi!", messageType: "text", createdAt: nowIso(-1800_000) });
    }

    return NextResponse.json({ ok: true, properties: ensuredProps, clients: ensuredClients });
  } catch (err: any) {
    console.error("seed error", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";





