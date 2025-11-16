import { db } from "@/lib/db";
import {
  properties,
  clients,
  prospects,
  conversations,
  messages,
  appointments,
  conversationStates,
} from "@/lib/db";
import { and, eq, inArray } from "drizzle-orm";

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

export async function seedDummyProspectsForProperty(propertyId: string) {
  if (!propertyId) throw new Error("propertyId is required");

  const propRows = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
  const prop = propRows[0];
  if (!prop) throw new Error("Property not found");

  const demoClients = [
    { name: "Ava Tan", phone: "6591111111", email: "ava.tan@example.com", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop" },
    { name: "Marcus Lee", phone: "6592222222", email: "marcus.lee@example.com", avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400&auto=format&fit=crop" },
    { name: "Priya Sharma", phone: "6593333333", email: "priya.sharma@example.com", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop" },
    { name: "Daniel Wong", phone: "6594444444", email: "daniel.wong@example.com", avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=400&auto=format&fit=crop" },
    { name: "Siti Nur", phone: "6595555555", email: "siti.nur@example.com", avatar: "https://images.unsplash.com/photo-1544005313-ffaf6bfe8f8c?q=80&w=400&auto=format&fit=crop" },
  ];

  const phones = demoClients.map((c) => c.phone);
  const existing = await db
    .select({ id: clients.id, phone: clients.phone })
    .from(clients)
    .where(inArray(clients.phone, phones));
  const byPhone = new Map(existing.map((e) => [e.phone as string, e.id as string]));

  const ensuredClients: Array<{ id: string; name: string; phone: string }> = [];
  for (const c of demoClients) {
    const foundId = byPhone.get(c.phone);
    if (foundId) {
      ensuredClients.push({ id: foundId, name: c.name, phone: c.phone });
    } else {
      const [ins] = await db
        .insert(clients)
        .values({ ...c, score: 80, status: "active" })
        .returning();
      ensuredClients.push({ id: ins.id, name: ins.name, phone: ins.phone });
    }
  }

  const stagePlans = [
    { label: "active", idx: 0, summary: "Initial interest captured. Awaiting screening.", lastMessageAt: nowIso(-7 * 24 * 60 * 60 * 1000), score: 92 },
    { label: "active", idx: 1, summary: "Looking for 2BR, budget flexible.", lastMessageAt: nowIso(-5 * 24 * 60 * 60 * 1000), score: 88 },
    { label: "screening_sent", idx: 2, summary: "Budget $7k, 2 pax, no pets.", lastMessageAt: nowIso(-60 * 60 * 1000), score: 85 },
    { label: "screening_sent", idx: 3, summary: "Family of 4, need parking.", lastMessageAt: nowIso(-3 * 60 * 60 * 1000), score: 82 },
    { label: "replied", idx: 4, summary: "Budget $6k, family of 3, flexible move-in.", lastMessageAt: nowIso(-2 * 60 * 60 * 1000), score: 78 },
    { label: "viewing_scheduled", idx: 0, summary: "Keen to view this weekend.", lastMessageAt: nowIso(-30 * 60 * 1000), score: 95 },
    { label: "viewing_scheduled", idx: 1, summary: "Available for viewing Thursday.", lastMessageAt: nowIso(-45 * 60 * 1000), score: 90 },
    { label: "converted", idx: 2, summary: "Offer accepted, proceeding to paperwork.", lastMessageAt: nowIso(-5 * 60 * 1000), score: 98 },
  ] as const;

  const created: Array<{ clientName: string; phone: string; stage: string }> = [];

  for (const plan of stagePlans) {
    const c = ensuredClients[plan.idx % ensuredClients.length];

    const existingPros = await db
      .select()
      .from(prospects)
      .where(and(eq(prospects.clientId, c.id), eq(prospects.propertyId, propertyId)))
      .limit(1);

    if (existingPros.length === 0) {
      await db.insert(prospects).values({
        clientId: c.id,
        propertyId: propertyId,
        score: plan.score,
        summary: plan.summary,
        lastMessageAt: plan.lastMessageAt || nowIso(),
        status: plan.label,
      });
    } else {
      // Update existing prospect to the planned stage
      await db
        .update(prospects)
        .set({ status: plan.label, score: plan.score, summary: plan.summary, updatedAt: nowIso() })
        .where(eq(prospects.id, existingPros[0].id));
    }

    // replied stage: ensure conversation with a client reply
    if (plan.label === "replied") {
      let conv = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.clientId, c.id), eq(conversations.platform, "whatsapp")))
        .limit(1);
      if (conv.length === 0) {
        const [insConv] = await db
          .insert(conversations)
          .values({ clientId: c.id, propertyId, platform: "whatsapp", status: "active" })
          .returning();
        conv = [insConv];
      }
      await db.insert(messages).values({
        conversationId: conv[0].id,
        from: "client",
        text: "Hi, I'm interested. When are viewings?",
        messageType: "text",
        status: "sent",
      });
    }

    // viewing_scheduled stage: create appointment
    if (plan.label === "viewing_scheduled") {
      await db.insert(appointments).values({
        userId: (prop.userId as string) || ensuredClients[0].id,
        clientId: c.id,
        propertyId,
        title: "Property viewing",
        eventType: "viewing",
        status: "scheduled",
        startTime: nowIso(2 * 24 * 60 * 60 * 1000),
        endTime: nowIso(2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        timezone: "Asia/Singapore",
        location: prop.address || "TBD",
      });
    }

    // add screening answers for demographics
    if (prop.userId) {
      await db.insert(conversationStates).values({
        userId: prop.userId,
        clientPhone: c.phone,
        step: 4,
        answers: JSON.stringify({
          nationality: plan.idx % 2 === 0 ? "Singaporean" : "PR",
          occupation: plan.idx % 2 === 0 ? "Engineer" : "Designer",
          tenants: plan.idx === 2 ? "3 pax" : plan.idx === 1 ? "2 pax" : "1 pax",
          move_in: "Next month",
          budget: plan.idx === 1 ? "7000" : plan.idx === 2 ? "6000" : "5500",
        }),
        propertyId,
        status: "active",
      });
    }

    created.push({ clientName: c.name, phone: c.phone, stage: plan.label });
  }

  return { ok: true, propertyId, created };
}





