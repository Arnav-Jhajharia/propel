import { db } from "@/lib/db";
import {
  properties,
  clients,
  prospects,
  conversations,
  messages,
  appointments,
  conversationStates,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

// Realistic Singapore names and demographics with realistic phone numbers
const demoClients = [
  { name: "Siti Nur", phone: "6598234567", email: "siti.nur@example.com", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop", nationality: "Singaporean", occupation: "Engineer" },
  { name: "Daniel Wong", phone: "6591872345", email: "daniel.wong@example.com", avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400&auto=format&fit=crop", nationality: "PR", occupation: "Designer" },
  { name: "Priya Sharma", phone: "6592345678", email: "priya.sharma@example.com", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop", nationality: "Singaporean", occupation: "Engineer" },
  { name: "Marcus Lee", phone: "6598765432", email: "marcus.lee@example.com", avatar: "https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=400&auto=format&fit=crop", nationality: "PR", occupation: "Designer" },
  { name: "Ava Tan", phone: "6593456789", email: "ava.tan@example.com", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop", nationality: "Singaporean", occupation: "Engineer" },
  { name: "James Lim", phone: "6594567890", email: "james.lim@example.com", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop", nationality: "Singaporean", occupation: "Manager" },
  { name: "Sarah Chen", phone: "6595678901", email: "sarah.chen@example.com", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop", nationality: "PR", occupation: "Teacher" },
  { name: "Kevin Ng", phone: "6596789012", email: "kevin.ng@example.com", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop", nationality: "Singaporean", occupation: "Developer" },
  { name: "Michelle Koh", phone: "6597890123", email: "michelle.koh@example.com", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop", nationality: "Singaporean", occupation: "Consultant" },
  { name: "Ryan Teo", phone: "6598901234", email: "ryan.teo@example.com", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop", nationality: "PR", occupation: "Analyst" },
];

export async function seedDummyProspectsForProperty(propertyId: string) {
  if (!propertyId) throw new Error("propertyId is required");

  const propRows = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
  const prop = propRows[0];
  if (!prop) throw new Error("Property not found");

  const propertyPrice = prop.price || 4200;

  // Ensure all clients exist
  const phones = demoClients.map((c) => c.phone);
  const existing = await db
    .select({ id: clients.id, phone: clients.phone })
    .from(clients)
    .where(inArray(clients.phone, phones));
  const byPhone = new Map(existing.map((e) => [e.phone as string, e.id as string]));

  // Also check for old phone numbers and update them
  const oldPhoneMap: Record<string, string> = {
    '6591111111': '6593456789',
    '6592222222': '6598765432',
    '6593333333': '6592345678',
    '6594444444': '6591872345',
    '6595555555': '6598234567',
    '6596666666': '6594567890',
    '6597777777': '6595678901',
    '6598888888': '6596789012',
    '6599999999': '6597890123',
    '6590000000': '6598901234',
  };

  // Update any clients with old phone numbers
  for (const [oldPhone, newPhone] of Object.entries(oldPhoneMap)) {
    const oldClient = await db.select().from(clients).where(eq(clients.phone, oldPhone)).limit(1);
    if (oldClient.length > 0) {
      const conflict = await db.select().from(clients).where(eq(clients.phone, newPhone)).limit(1);
      if (conflict.length === 0) {
        await db.update(clients).set({ phone: newPhone }).where(eq(clients.phone, oldPhone));
      }
    }
  }

  const ensuredClients: Array<{ id: string; name: string; phone: string; nationality: string; occupation: string }> = [];
  for (const c of demoClients) {
    const foundId = byPhone.get(c.phone);
    if (foundId) {
      ensuredClients.push({ id: foundId, name: c.name, phone: c.phone, nationality: c.nationality, occupation: c.occupation });
    } else {
      const [ins] = await db
        .insert(clients)
        .values({ name: c.name, phone: c.phone, email: c.email, avatar: c.avatar, score: 80, status: "active" })
        .returning();
      ensuredClients.push({ id: ins.id, name: c.name, phone: c.phone, nationality: c.nationality, occupation: c.occupation });
    }
  }

  // Define 10 prospects with realistic scenarios
  // 4-5 requiring attention, 5-6 normal
  const prospectPlans = [
    // REQUIRING ATTENTION (5 prospects)
    {
      clientIdx: 0, // Siti Nur
      score: 90,
      budget: propertyPrice + 300, // Good budget
      budgetStr: String(propertyPrice + 300),
      tenants: "1 pax",
      moveIn: "Next month",
      stage: "converted",
      lastMessageAt: nowIso(-2 * 24 * 60 * 60 * 1000), // 2 days ago
      summary: `Budget S$${propertyPrice + 300}, 1 pax, move-in next month. Very interested.`,
      hasConversation: true,
      hasAppointment: false,
      requiresAttention: false, // Actually good - converted
    },
    {
      clientIdx: 1, // Daniel Wong
      score: 85,
      budget: propertyPrice - 200, // Below threshold (< 90%)
      budgetStr: String(propertyPrice - 200),
      tenants: "1 pax",
      moveIn: "Next month",
      stage: "viewing_scheduled",
      lastMessageAt: nowIso(-1 * 24 * 60 * 60 * 1000), // 1 day ago
      summary: `Budget S$${propertyPrice - 200}, 1 pax. Viewing scheduled.`,
      hasConversation: true,
      hasAppointment: true,
      requiresAttention: true, // Budget below threshold
    },
    {
      clientIdx: 2, // Priya Sharma
      score: 80,
      budget: propertyPrice + 600, // Good budget
      budgetStr: String(propertyPrice + 600),
      tenants: "3 pax",
      moveIn: null, // MISSING - requires attention
      stage: "replied",
      lastMessageAt: nowIso(-6 * 24 * 60 * 60 * 1000), // 6 days ago - no recent response
      summary: `Budget S$${propertyPrice + 600}, 3 pax. Interested but need to confirm dates.`,
      hasConversation: true,
      hasAppointment: false,
      requiresAttention: true, // Missing move-in date AND no response in 5+ days
    },
    {
      clientIdx: 3, // Marcus Lee
      score: 75,
      budget: propertyPrice - 500, // Way too low (< 70%)
      budgetStr: String(propertyPrice - 500),
      tenants: "2 pax",
      moveIn: "Next month",
      stage: "screening_sent",
      lastMessageAt: nowIso(-3 * 60 * 60 * 1000), // 3 hours ago
      summary: `Budget S$${propertyPrice - 500}, 2 pax. Screening completed.`,
      hasConversation: false,
      hasAppointment: false,
      requiresAttention: true, // Budget way too low
    },
    {
      clientIdx: 4, // Ava Tan
      score: 70,
      budget: null, // MISSING - requires attention
      budgetStr: null,
      tenants: "1 pax",
      moveIn: "Next month",
      stage: "active",
      lastMessageAt: nowIso(-2 * 60 * 60 * 1000), // 2 hours ago
      summary: `1 pax, move-in next month. Budget to be confirmed.`,
      hasConversation: false,
      hasAppointment: false,
      requiresAttention: true, // Missing budget
    },
    {
      clientIdx: 5, // James Lim
      score: 88,
      budget: propertyPrice + 400, // Good budget
      budgetStr: String(propertyPrice + 400),
      tenants: "1 pax",
      moveIn: "Next month",
      stage: "viewing_scheduled",
      lastMessageAt: nowIso(-4 * 24 * 60 * 60 * 1000), // 4 days ago
      summary: `Budget S$${propertyPrice + 400}, 1 pax. Viewing scheduled but not confirmed.`,
      hasConversation: true,
      hasAppointment: true,
      requiresAttention: true, // Viewing scheduled but not confirmed + high score no response
    },
    // NORMAL PROSPECTS (5 prospects)
    {
      clientIdx: 6, // Sarah Chen
      score: 95,
      budget: propertyPrice + 500, // Perfect match
      budgetStr: String(propertyPrice + 500),
      tenants: "2 pax",
      moveIn: "Next month",
      stage: "converted",
      lastMessageAt: nowIso(-30 * 60 * 1000), // 30 minutes ago
      summary: `Budget S$${propertyPrice + 500}, 2 pax. Offer accepted!`,
      hasConversation: true,
      hasAppointment: false,
      requiresAttention: false,
    },
    {
      clientIdx: 7, // Kevin Ng
      score: 82,
      budget: propertyPrice + 200, // Good fit
      budgetStr: String(propertyPrice + 200),
      tenants: "1 pax",
      moveIn: "Next month",
      stage: "replied",
      lastMessageAt: nowIso(-1 * 24 * 60 * 60 * 1000), // 1 day ago
      summary: `Budget S$${propertyPrice + 200}, 1 pax. Actively engaged.`,
      hasConversation: true,
      hasAppointment: false,
      requiresAttention: false,
    },
    {
      clientIdx: 8, // Michelle Koh
      score: 78,
      budget: propertyPrice + 100, // Good fit
      budgetStr: String(propertyPrice + 100),
      tenants: "1 pax",
      moveIn: "Next month",
      stage: "screening_sent",
      lastMessageAt: nowIso(-2 * 24 * 60 * 60 * 1000), // 2 days ago
      summary: `Budget S$${propertyPrice + 100}, 1 pax. Screening in progress.`,
      hasConversation: false,
      hasAppointment: false,
      requiresAttention: false,
    },
    {
      clientIdx: 9, // Ryan Teo
      score: 85,
      budget: propertyPrice + 350, // Good fit
      budgetStr: String(propertyPrice + 350),
      tenants: "2 pax",
      moveIn: "Next month",
      stage: "viewing_scheduled",
      lastMessageAt: nowIso(-12 * 60 * 60 * 1000), // 12 hours ago
      summary: `Budget S$${propertyPrice + 350}, 2 pax. Viewing confirmed for this weekend.`,
      hasConversation: true,
      hasAppointment: true,
      requiresAttention: false,
    },
  ];

  const created: Array<{ clientName: string; phone: string; stage: string }> = [];

  for (const plan of prospectPlans) {
    const c = ensuredClients[plan.clientIdx];

    // Check if prospect already exists
    const existingPros = await db
      .select()
      .from(prospects)
      .where(and(eq(prospects.clientId, c.id), eq(prospects.propertyId, propertyId)))
      .limit(1);

    let prospectId: string;
    if (existingPros.length === 0) {
      const [ins] = await db
        .insert(prospects)
        .values({
          clientId: c.id,
          propertyId: propertyId,
          score: plan.score,
          summary: plan.summary,
          lastMessageAt: plan.lastMessageAt,
          status: plan.stage === "converted" ? "converted" : "active",
        })
        .returning();
      prospectId = ins.id;
    } else {
      prospectId = existingPros[0].id;
      await db
        .update(prospects)
        .set({
          score: plan.score,
          summary: plan.summary,
          lastMessageAt: plan.lastMessageAt,
          status: plan.stage === "converted" ? "converted" : "active",
          updatedAt: nowIso(),
        })
        .where(eq(prospects.id, prospectId));
    }

    // Create conversation if needed
    if (plan.hasConversation) {
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

      // Add a client message for replied/viewing stages
      if (plan.stage === "replied" || plan.stage === "viewing_scheduled") {
        const existingMsg = await db
          .select()
          .from(messages)
          .where(and(eq(messages.conversationId, conv[0].id), eq(messages.from, "client")))
          .limit(1);
        if (existingMsg.length === 0) {
          await db.insert(messages).values({
            conversationId: conv[0].id,
            from: "client",
            text: plan.stage === "viewing_scheduled" 
              ? "Hi, I'm very interested. Can we schedule a viewing this weekend?" 
              : "Thanks for the info! I'll discuss with my partner and get back to you.",
            messageType: "text",
            status: "sent",
            createdAt: plan.lastMessageAt,
          });
        }
      }
    }

    // Create appointment for viewing_scheduled
    if (plan.hasAppointment) {
      const existingAppt = await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.clientId, c.id), eq(appointments.propertyId, propertyId)))
        .limit(1);
      if (existingAppt.length === 0) {
        await db.insert(appointments).values({
          userId: (prop.userId as string) || c.id,
          clientId: c.id,
          propertyId,
          title: "Property viewing",
          eventType: "viewing",
          status: plan.stage === "viewing_scheduled" && plan.requiresAttention ? "scheduled" : "confirmed",
          startTime: nowIso(2 * 24 * 60 * 60 * 1000),
          endTime: nowIso(2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          timezone: "Asia/Singapore",
          location: prop.address || "TBD",
        });
      }
    }

    // Create conversation state with screening answers
    if (prop.userId) {
      const existingState = await db
        .select()
        .from(conversationStates)
        .where(and(eq(conversationStates.clientPhone, c.phone), eq(conversationStates.userId, prop.userId)))
        .limit(1);

      const answers: any = {
        nationality: c.nationality,
        occupation: c.occupation,
        tenants: plan.tenants,
      };
      if (plan.moveIn) answers.move_in = plan.moveIn;
      if (plan.budgetStr) answers.budget = plan.budgetStr;

      if (existingState.length === 0) {
        await db.insert(conversationStates).values({
          userId: prop.userId,
          clientPhone: c.phone,
          step: 4,
          answers: JSON.stringify(answers),
          propertyId,
          status: "active",
        });
      } else {
        await db
          .update(conversationStates)
          .set({
            answers: JSON.stringify(answers),
            updatedAt: nowIso(),
          })
          .where(eq(conversationStates.id, existingState[0].id));
      }
    }

    created.push({ clientName: c.name, phone: c.phone, stage: plan.stage });
  }

  return { ok: true, propertyId, created: created.length, prospects: created };
}
