import { NextResponse } from "next/server";
import { db, clients, conversations, messages, users } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { simpleDecrypt } from "@/lib/encryption";
import { runLeadAgent } from "@/agent/leadGraph";
import { loadLeadState, saveLeadState } from "@/lib/lead-state-persistence";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "dev-verify-token";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  // For webhooks, we need to determine which user's WhatsApp account this is
  // This is tricky because webhooks don't have session context
  // We'll need to match the phone number ID to a user

  const body = await req.json();
  try {
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const value = change?.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        const incomingMessages = value?.messages ?? [];
        const statusUpdates = value?.statuses ?? [];
        const messageEchoes = value?.message_echoes ?? []; // Messages sent from agent's WhatsApp Business app

        // Find the user who owns this WhatsApp phone number
        let user = null;
        if (phoneNumberId) {
          const userResults = await db
            .select()
            .from(users)
            .where(eq(users.whatsappPhoneId, phoneNumberId))
            .limit(1);
          user = userResults[0] || null;
        }

        if (!user || !user.whatsappToken || !user.whatsappPhoneId) {
          console.log(`No user found for phone number ID: ${phoneNumberId} or missing WhatsApp credentials`);
          continue;
        }

        // Decrypt WhatsApp credentials
        let whatsappToken: string;
        let whatsappPhoneId: string;
        
        try {
          whatsappToken = simpleDecrypt(user.whatsappToken);
          whatsappPhoneId = simpleDecrypt(user.whatsappPhoneId);
        } catch (error) {
          console.error('Failed to decrypt WhatsApp credentials for user:', user.id, error);
          continue;
        }

        for (const msg of incomingMessages) {
          const from = msg.from; // client's phone number
          const type = msg.type;
          const text = type === "text" ? msg.text?.body : undefined;

          if (!from || !text) continue;

          // Check if client exists in database
          let client = await db
            .select()
            .from(clients)
            .where(eq(clients.phone, from))
            .limit(1);

          // Create client if doesn't exist
          if (client.length === 0) {
            const [newClient] = await db.insert(clients).values({
              name: `Client ${from.slice(-4)}`, // Use last 4 digits as name
              phone: from,
              score: 0,
              status: 'active',
            }).returning();
            client = [newClient];
          }

          const clientData = client[0];

          // Create or get conversation
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
            from: 'client',
            text: text.trim(),
            messageType: 'text',
            status: 'sent',
          });

          // Use intelligent lead agent to handle the conversation
          try {
            // Fetch conversation history from database (last 20 messages)
            const historyMessages = await db
              .select({
                role: messages.from,
                text: messages.text,
              })
              .from(messages)
              .where(eq(messages.conversationId, conversation[0].id))
              .orderBy(desc(messages.createdAt))
              .limit(20);

            // Convert to lead agent format (reverse to get chronological order)
            const history = historyMessages
              .reverse()
              .map((msg) => ({
                role: msg.role === 'client' ? ('user' as const) : ('assistant' as const),
                text: msg.text || '',
              }))
              .slice(0, -1); // Exclude the current message

            // Load persisted state (screening answers, property info, etc.)
            const persistedState = await loadLeadState(user.id, from);

            // Call lead agent with persisted state
            const result = await runLeadAgent(
              {
                userId: user.id,
                message: text.trim(),
                history: history,
              },
              persistedState || undefined
            );

            // Save updated state back to database
            if (result.state) {
              await saveLeadState(user.id, from, result.state);
            }

            // Send reply via WhatsApp
            if (result.reply) {
              await sendAndSaveWhatsApp(
                whatsappToken,
                whatsappPhoneId,
                from,
                result.reply,
                conversation[0].id
              );
            }
          } catch (error) {
            console.error('Error processing message with lead agent:', error);
            // Fallback reply
            await sendAndSaveWhatsApp(
              whatsappToken,
              whatsappPhoneId,
              from,
              "Thanks for your message! I'm here to help with your rental inquiry. How can I assist you today?",
              conversation[0].id
            );
          }
        }

        // Handle message echoes (messages sent by agent from WhatsApp Business app)
        for (const echo of messageEchoes) {
          const from = echo.from; // agent's business phone number
          const to = echo.to; // client's phone number
          const type = echo.type;
          const text = type === "text" ? echo.text?.body : undefined;
          const messageId = echo.id;

          if (!to || !text) continue;

          try {
            // Find or create client
            let client = await db
              .select()
              .from(clients)
              .where(eq(clients.phone, to))
              .limit(1);

            if (client.length === 0) {
              const [newClient] = await db.insert(clients).values({
                name: `Client ${to.slice(-4)}`,
                phone: to,
                score: 0,
                status: 'active',
              }).returning();
              client = [newClient];
            }

            // Find or create conversation
            let conversation = await db
              .select()
              .from(conversations)
              .where(and(
                eq(conversations.clientId, client[0].id),
                eq(conversations.platform, 'whatsapp')
              ))
              .limit(1);

            if (conversation.length === 0) {
              const [newConversation] = await db.insert(conversations).values({
                clientId: client[0].id,
                platform: 'whatsapp',
                status: 'active',
              }).returning();
              conversation = [newConversation];
            }

            // Save agent's message from phone to database
            await db.insert(messages).values({
              conversationId: conversation[0].id,
              from: 'agent',
              text: text.trim(),
              messageType: 'text',
              status: 'sent',
              whatsappMessageId: messageId,
            });

            console.log(`Saved message echo from agent to ${to}: ${text}`);
          } catch (error) {
            console.error('Error processing message echo:', error);
          }
        }

        // Handle status updates (sent, delivered, read, failed)
        for (const status of statusUpdates) {
          const messageId = status.id; // WhatsApp Message ID (wamid)
          const statusType = status.status; // 'sent', 'delivered', 'read', 'failed'
          const timestamp = status.timestamp;
          const recipientId = status.recipient_id;

          try {
            // Find message by WhatsApp Message ID
            const messageResults = await db
              .select()
              .from(messages)
              .where(eq(messages.whatsappMessageId, messageId))
              .limit(1);

            if (messageResults.length === 0) {
              console.log(`Message not found for status update: ${messageId}`);
              continue;
            }

            const message = messageResults[0];

            // Handle different status types
            if (statusType === 'failed') {
              // Extract error information
              const errors = status.errors ?? [];
              const errorInfo = errors.length > 0 ? {
                code: errors[0].code,
                title: errors[0].title,
                message: errors[0].message,
                details: errors[0].error_data?.details,
              } : null;

              // Update message status to failed
              await db.update(messages)
                .set({
                  status: 'failed',
                  metadata: errorInfo ? JSON.stringify(errorInfo) : message.metadata,
                })
                .where(eq(messages.id, message.id));

              console.error(`Message ${messageId} failed:`, errorInfo);
            } else {
              // Update message status (sent, delivered, read)
              await db.update(messages)
                .set({
                  status: statusType,
                })
                .where(eq(messages.id, message.id));

              console.log(`Message ${messageId} status updated to: ${statusType}`);
            }
          } catch (error) {
            console.error(`Error processing status update for ${messageId}:`, error);
          }
        }
      }
    }
  } catch (e) {
    console.error("WhatsApp webhook error:", e);
  }
  return NextResponse.json({ received: true });
}

async function sendWhatsApp(token: string, phoneId: string, to: string, text: string): Promise<string | null> {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text, preview_url: false },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      // WhatsApp returns: { messaging_product: "whatsapp", contacts: [...], messages: [{ id: "wamid.xxx" }] }
      return data.messages?.[0]?.id || null;
    }
    return null;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return null;
  }
}

/**
 * Sends a WhatsApp message and saves it to the database with status tracking
 */
async function sendAndSaveWhatsApp(
  token: string,
  phoneId: string,
  to: string,
  text: string,
  conversationId: string
): Promise<void> {
  try {
    // Send message and get WhatsApp Message ID
    const whatsappMessageId = await sendWhatsApp(token, phoneId, to, text);

    // Save to database
    await db.insert(messages).values({
      conversationId,
      from: 'agent',
      text: text.trim(),
      messageType: 'text',
      status: 'pending',
      whatsappMessageId: whatsappMessageId || undefined,
    });
  } catch (error) {
    console.error('Error sending and saving WhatsApp message:', error);
  }
}
