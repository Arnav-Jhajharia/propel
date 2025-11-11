import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, conversations, messages, conversationStates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = ctx.params;

    // Get client details
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const clientData = client[0];

    // Get conversation state for screening answers
    const stateRows = await db
      .select()
      .from(conversationStates)
      .where(eq(conversationStates.clientPhone, clientData.phone || ""))
      .orderBy(desc(conversationStates.updatedAt))
      .limit(1);

    let screeningAnswers: any = {};
    if (stateRows.length > 0 && stateRows[0].answers) {
      try {
        screeningAnswers = typeof stateRows[0].answers === 'string' 
          ? JSON.parse(stateRows[0].answers) 
          : stateRows[0].answers;
      } catch (e) {
        console.warn("Failed to parse conversation state answers:", e);
      }
    }

    // Demo fallbacks ("real fake data") when DB fields are missing
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    const futureDate = (days: number) => {
      const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00.000Z`;
    };
    const fallbackBudget = `S$${pick([4800, 5200, 5500, 6000, 6500, 7000, 7500]).toLocaleString()}`;
    const fallbackMoveInIso = futureDate(pick([14, 21, 28, 35]));
    const fallbackTenants = pick(["1 pax, no pets", "2 pax, no pets", "2 pax, has pets", "3 pax, no pets"]);
    const fallbackScore = pick([72, 78, 81, 85, 88, 92]);

    // Get messages for this client (from all conversations)
    const clientMessages = await db
      .select({
        id: messages.id,
        from: messages.from,
        text: messages.text,
        at: messages.createdAt,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.clientId, clientId))
      .orderBy(desc(messages.createdAt));

    const demoMessages = [
      { from: 'client', text: "Hi, I'm interested in the 2BR near River Valley.", at: new Date(Date.now() - 86400_000).toISOString() },
      { from: 'agent', text: "Happy to help! What's your monthly budget?", at: new Date(Date.now() - 86300_000).toISOString() },
      { from: 'client', text: fallbackBudget.replace('S$', '$') + ", can stretch a little.", at: new Date(Date.now() - 86200_000).toISOString() },
      { from: 'agent', text: "Great. When are you looking to move in?", at: new Date(Date.now() - 86100_000).toISOString() },
      { from: 'client', text: "In about 3 weeks.", at: new Date(Date.now() - 86000_000).toISOString() },
    ].map((m, i) => ({ id: `demo-${i}`, ...m }));

    // Format screening data with fallbacks - prioritize conversation state answers
    const budgetFromState = screeningAnswers.budget || screeningAnswers.Budget;
    const budget = budgetFromState 
      ? `S$${parseInt(String(budgetFromState).replace(/[^\d]/g, "")).toLocaleString()}`
      : (clientData.budget || fallbackBudget);
    
    const moveInFromState = screeningAnswers.move_in || screeningAnswers.moveIn;
    const moveInIso = moveInFromState 
      ? (() => {
          // Try to parse various date formats
          const d = new Date(moveInFromState);
          return isNaN(d.getTime()) ? fallbackMoveInIso : d.toISOString();
        })()
      : (clientData.moveInDate || fallbackMoveInIso);
    
    const tenantsFromState = screeningAnswers.tenants || screeningAnswers.Tenants;
    const tenantsText = tenantsFromState 
      ? tenantsFromState
      : ((clientData.tenantCount || clientData.hasPets != null)
          ? `${clientData.tenantCount || 1} pax${clientData.hasPets ? ", has pets" : ", no pets"}`
          : fallbackTenants);
    
    const screening = {
      budget,
      move_in: new Date(moveInIso).toLocaleDateString(),
      tenants: tenantsText,
    };

    return NextResponse.json({
      client: {
        id: clientData.id,
        name: clientData.name || pick(["Marcus Lee", "Ava Tan", "Priya Sharma", "Daniel Koh"]) as string,
        phone: clientData.phone || "+65 9" + Math.floor(10000000 + Math.random() * 89999999).toString(),
        email: (clientData as any).email || pick(["marcus@example.com", "ava@example.com", "priya@example.com"]) as string,
        avatar: clientData.avatar || "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400&auto=format&fit=crop",
        score: clientData.score ?? fallbackScore,
      },
      screening,
      messages: (clientMessages.length ? clientMessages : demoMessages).map((msg: any) => ({
        id: msg.id,
        from: msg.from,
        text: msg.text,
        at: msg.at,
      })),
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}