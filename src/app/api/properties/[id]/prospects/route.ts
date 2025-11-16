import { NextResponse } from "next/server";
import {
  db,
  properties,
  prospects,
  clients,
  appointments,
  conversations,
  messages,
  conversationStates,
} from "@/lib/db";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await ctx.params;
    if (!propertyId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Load property
    const pRows = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    const prop = pRows[0] || null;
    if (!prop) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Prospects + clients
    const pros = await db
      .select({
        prospectId: prospects.id,
        clientId: prospects.clientId,
        score: prospects.score,
        summary: prospects.summary,
        lastMessageAt: prospects.lastMessageAt,
        status: prospects.status,
        clientName: clients.name,
        clientPhone: clients.phone,
        clientEmail: clients.email,
      })
      .from(prospects)
      .innerJoin(clients, eq(prospects.clientId, clients.id))
      .where(eq(prospects.propertyId, propertyId))
      .orderBy(desc(prospects.score));

    const clientIds = pros.map((r) => r.clientId);

    // Appointments presence (viewing scheduled)
    const appts = clientIds.length
      ? await db
          .select({ clientId: appointments.clientId, status: appointments.status })
          .from(appointments)
          .where(and(eq(appointments.propertyId, propertyId), inArray(appointments.clientId, clientIds)))
      : [];
    const clientHasAppt = new Set(appts.filter((a) => (a.status || "scheduled") !== "canceled").map((a) => a.clientId || ""));

    // Conversations → last client message timestamps
    const convs = clientIds.length
      ? await db
          .select({ id: conversations.id, clientId: conversations.clientId })
          .from(conversations)
          .where(and(inArray(conversations.clientId, clientIds)))
      : [];
    const convIdByClient = new Map(convs.map((c) => [c.clientId as string, c.id as string]));
    const convIds = convs.map((c) => c.id);
    const lastClientMsgs = convIds.length
      ? await db
          .select({ conversationId: messages.conversationId, createdAt: messages.createdAt })
          .from(messages)
          .where(and(inArray(messages.conversationId, convIds), eq(messages.from, "client")))
          .orderBy(desc(messages.createdAt))
      : [];
    const lastMsgByConv = new Map<string, string>();
    for (const m of lastClientMsgs) {
      if (!lastMsgByConv.has(m.conversationId as string)) lastMsgByConv.set(m.conversationId as string, (m.createdAt as string) || "");
    }

    // Conversation state answers per client (latest by updatedAt)
    const states = pros.length
      ? await db
          .select({ clientPhone: conversationStates.clientPhone, answers: conversationStates.answers, updatedAt: conversationStates.updatedAt })
          .from(conversationStates)
          .where(and(eq(conversationStates.status, "active")))
      : [];
    const answersByPhone = new Map<string, any>();
    for (const s of states) {
      const phone = (s.clientPhone as string) || "";
      if (!phone) continue;
      const existing = answersByPhone.get(phone);
      if (!existing || new Date(s.updatedAt || 0).getTime() > new Date(existing.updatedAt || 0).getTime()) {
        let answers: any = {};
        try { answers = typeof s.answers === "string" ? JSON.parse(s.answers as any) : s.answers; } catch { answers = {}; }
        answersByPhone.set(phone, { answers, updatedAt: s.updatedAt });
      }
    }

    const deriveStage = (row: any): string => {
      if (clientHasAppt.has(row.clientId)) return "viewing_scheduled";
      if ((row.status || "") === "converted") return "converted";
      const convId = convIdByClient.get(row.clientId);
      const lastClient = convId ? lastMsgByConv.get(convId) : undefined;
      if (lastClient) return "replied";
      if (row.lastMessageAt) return "screening_sent";
      return "active";
    };

    const result = pros.map((r) => {
      const a = answersByPhone.get((r.clientPhone || "") as string);
      return {
        clientId: r.clientId,
        clientName: r.clientName,
        phone: r.clientPhone,
        score: r.score,
        summary: r.summary,
        lastMessageAt: r.lastMessageAt,
        stage: deriveStage(r),
        answers: a?.answers || {},
      };
    });

    return NextResponse.json({ property: { id: prop.id, title: prop.title, address: prop.address, price: prop.price }, prospects: result });
  } catch (err: any) {
    console.error("prospects aggregate error", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
