import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appointments, clients, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyCalendlySignature } from '@/lib/calendly';
import { createId } from '@paralleldrive/cuid2';

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const sig = request.headers.get('Calendly-Webhook-Signature');
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!verifyCalendlySignature(raw, sig, signingKey)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing user' }, { status: 400 });

  let userRows;
  try {
    userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  } catch {
    userRows = [] as any;
  }
  if (userRows.length === 0) return NextResponse.json({ ok: true });

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
  }

  const eventType = body.event as string | undefined;
  const payload = body.payload || {};

  try {
    const invitee = payload.invitee || {};
    const scheduled = payload.scheduled_event || payload.event || {};
    const calendlyInviteeUri: string | undefined = invitee.uri;
    const calendlyEventUri: string | undefined = scheduled.uri || payload.event_uri;
    const title: string | undefined = scheduled.name || scheduled.event_type?.name;
    const startTime: string | undefined = scheduled.start_time;
    const endTime: string | undefined = scheduled.end_time;
    const timezone: string | undefined = scheduled.start_time && scheduled.start_time_zone ? scheduled.start_time_zone : payload.timezone;
    const location: string | undefined = scheduled.location?.location || scheduled.location?.join_url || scheduled.location?.value;
    const inviteeName: string | undefined = invitee.name;
    const inviteeEmail: string | undefined = invitee.email;
    const inviteePhone: string | undefined = invitee.sms_number || invitee.phone_number;

    // Find client by email or phone
    let clientId: string | undefined;
    if (inviteeEmail) {
      const rows = await db.select().from(clients).where(eq(clients.email, inviteeEmail)).limit(1);
      if (rows.length) clientId = rows[0].id;
    }
    if (!clientId && inviteePhone) {
      const rows = await db.select().from(clients).where(eq(clients.phone, inviteePhone)).limit(1);
      if (rows.length) clientId = rows[0].id;
    }

    // Upsert by invitee uri if present, else by event uri
    if (calendlyInviteeUri) {
      const existing = await db.select().from(appointments).where(and(eq(appointments.userId, userId), eq(appointments.calendlyInviteeUri, calendlyInviteeUri))).limit(1);
      if (existing.length) {
        await db.update(appointments).set({
          title,
          startTime,
          endTime,
          timezone,
          location,
          inviteeName,
          inviteeEmail,
          inviteePhone,
          status: eventType === 'invitee.canceled' ? 'canceled' : 'scheduled',
          updatedAt: new Date().toISOString(),
        }).where(eq(appointments.id, existing[0].id));
      } else {
        await db.insert(appointments).values({
          id: createId(),
          userId,
          clientId,
          title,
          eventType: scheduled.event_type || undefined,
          status: eventType === 'invitee.canceled' ? 'canceled' : 'scheduled',
          startTime,
          endTime,
          timezone,
          location,
          inviteeName,
          inviteeEmail,
          inviteePhone,
          calendlyEventUri,
          calendlyInviteeUri,
        });
      }
    } else if (calendlyEventUri) {
      const existing = await db.select().from(appointments).where(and(eq(appointments.userId, userId), eq(appointments.calendlyEventUri, calendlyEventUri))).limit(1);
      if (existing.length) {
        await db.update(appointments).set({
          title,
          startTime,
          endTime,
          timezone,
          location,
          inviteeName,
          inviteeEmail,
          inviteePhone,
          status: eventType === 'invitee.canceled' ? 'canceled' : 'scheduled',
          updatedAt: new Date().toISOString(),
        }).where(eq(appointments.id, existing[0].id));
      } else {
        await db.insert(appointments).values({
          id: createId(),
          userId,
          clientId,
          title,
          eventType: scheduled.event_type || undefined,
          status: eventType === 'invitee.canceled' ? 'canceled' : 'scheduled',
          startTime,
          endTime,
          timezone,
          location,
          inviteeName,
          inviteeEmail,
          inviteePhone,
          calendlyEventUri,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Calendly webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

export const dynamic = 'force-dynamic';





