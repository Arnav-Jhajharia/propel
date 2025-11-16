import { NextResponse } from "next/server";
import { getSession } from "@/lib/simple-auth";
import { db, users, messages, conversations, clients } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { simpleDecrypt } from "@/lib/encryption";
import { validatePhoneNumber } from "@/lib/phone-validation";

export async function POST(req: Request) {
  try {
    const { to, text, template, template_language = "en_US" } = await req.json();
    if (!to || (!text && !template)) {
      return NextResponse.json(
        { error: "Missing 'to' and either 'text' or 'template'" },
        { status: 400 }
      );
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(to);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { error: `Invalid phone number: ${phoneValidation.error}` },
        { status: 400 }
      );
    }

    const validatedPhone = phoneValidation.formatted!;

    // Get user session to access their WhatsApp credentials
    const token = req.headers.get('cookie')?.split('session-token=')[1]?.split(';')[0];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's WhatsApp credentials
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Decrypt WhatsApp credentials
    let whatsappToken: string | null = null;
    let phoneId: string | null = null;
    
    try {
      whatsappToken = user[0].whatsappToken ? simpleDecrypt(user[0].whatsappToken) : null;
      phoneId = user[0].whatsappPhoneId ? simpleDecrypt(user[0].whatsappPhoneId) : null;
    } catch (error) {
      console.error('Failed to decrypt WhatsApp credentials:', error);
      return NextResponse.json(
        {
          error: "Failed to decrypt WhatsApp credentials. Please reconfigure your WhatsApp settings.",
        },
        { status: 500 }
      );
    }

    if (!whatsappToken || !phoneId) {
      return NextResponse.json(
        {
          error: "WhatsApp Business API not configured. Please set up your WhatsApp credentials in the Integrations page.",
        },
        { status: 400 }
      );
    }

    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

    const payload: any = {
      messaging_product: "whatsapp",
      to: validatedPhone,
    };

    if (text) {
      Object.assign(payload, { type: "text", text: { body: text, preview_url: false } });
    } else if (template) {
      Object.assign(payload, {
        type: "template",
        template: {
          name: template,
          language: { code: template_language },
        },
      });
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${whatsappToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('WhatsApp API error:', data);
      return NextResponse.json({
        error: data?.error?.message || data?.error || "Failed to send WhatsApp message",
        details: data
      }, { status: resp.status });
    }

    // Extract WhatsApp Message ID from response
    const whatsappMessageId = data.messages?.[0]?.id || null;

    // Find or create client and conversation for this phone number
    try {
      // Find client by phone
      let client = await db
        .select()
        .from(clients)
        .where(eq(clients.phone, validatedPhone))
        .limit(1);

      // Create client if doesn't exist
      if (client.length === 0) {
        const [newClient] = await db.insert(clients).values({
          name: `Client ${validatedPhone.slice(-4)}`,
          phone: validatedPhone,
          score: 0,
          status: 'active',
        }).returning();
        client = [newClient];
      }

      const clientData = client[0];

      // Find or create conversation
      let conversation = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.clientId, clientData.id),
          eq(conversations.platform, 'whatsapp')
        ))
        .limit(1);

      if (conversation.length === 0) {
        const [newConversation] = await db.insert(conversations).values({
          clientId: clientData.id,
          platform: 'whatsapp',
          status: 'active',
        }).returning();
        conversation = [newConversation];
      }

      // Save message to database
      await db.insert(messages).values({
        conversationId: conversation[0].id,
        from: 'agent',
        text: text || `[Template: ${template}]`,
        messageType: text ? 'text' : 'template',
        status: 'pending',
        whatsappMessageId: whatsappMessageId || undefined,
      });
    } catch (dbError) {
      console.error('Error saving message to database:', dbError);
      // Don't fail the request if database save fails
    }

    return NextResponse.json({ ok: true, data, messageId: whatsappMessageId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}