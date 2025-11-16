import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appointments } from '@/lib/db/schema';
import { getSession } from '@/lib/simple-auth';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { createId } from '@paralleldrive/cuid2';
import { ensureGoogleAccessToken, googleCreateEvent } from '@/lib/google';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, startTime, endTime, inviteeName, inviteeEmail, inviteePhone } = body || {};
    if (!startTime || !endTime) return NextResponse.json({ error: 'startTime and endTime are required (ISO strings)' }, { status: 400 });

    let userId: string | null = null;
    try { const { userId: clerkUserId } = await clerkAuth(); if (clerkUserId) userId = clerkUserId; } catch {}
    if (!userId) { const token = request.headers.get('cookie')?.split('session-token=')[1]?.split(';')[0]; if (token) { const session = await getSession(token); if (session?.user?.id) userId = session.user.id; } }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const TZ = 'Asia/Singapore';
    const sgOffsetMs = 8 * 60 * 60 * 1000;
    const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const formatSg = (epochMs: number): string => {
      const d = new Date(epochMs + sgOffsetMs);
      const y = d.getUTCFullYear();
      const m = pad2(d.getUTCMonth() + 1);
      const da = pad2(d.getUTCDate());
      const h = pad2(d.getUTCHours());
      const mi = pad2(d.getUTCMinutes());
      const s = pad2(d.getUTCSeconds());
      return `${y}-${m}-${da}T${h}:${mi}:${s}+08:00`;
    };
    const normalizeSG = (s: string): string => {
      if (!s) return s;
      if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
        const needsSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s);
        const base = needsSeconds ? `${s}:00` : s;
        return `${base}+08:00`;
      }
      return s;
    };

    // Coerce past dates to tomorrow in SG while preserving time-of-day
    const coerceToTomorrowIfPast = (s1: string, s2: string): { start: string; end: string } => {
      const now = new Date();
      const ms1 = Date.parse(s1);
      const ms2 = Date.parse(s2);
      const duration = Number.isFinite(ms2) && Number.isFinite(ms1) ? Math.max(15 * 60 * 1000, ms2 - ms1) : 60 * 60 * 1000;
      if (!Number.isFinite(ms1) || ms1 < now.getTime()) {
        const hh = (s1.match(/T(\d{2})/) || [,'15'])[1];
        const mm = (s1.match(/T\d{2}:(\d{2})/) || [,'00'])[1];
        const ss = (s1.match(/T\d{2}:\d{2}:(\d{2})/) || [,'00'])[1];
        const nowSg = new Date(now.getTime() + sgOffsetMs);
        nowSg.setDate(nowSg.getDate() + 1);
        const y = nowSg.getUTCFullYear();
        const m = nowSg.getUTCMonth() + 1;
        const d = nowSg.getUTCDate();
        const startEpoch = Date.UTC(y, m - 1, d, Number(hh), Number(mm), Number(ss)) - sgOffsetMs;
        const endEpoch = startEpoch + duration;
        const start = formatSg(startEpoch);
        const end = formatSg(endEpoch);
        return { start, end };
      }
      return { start: s1, end: s2 };
    };

    const coerced = coerceToTomorrowIfPast(startTime, endTime);

    const id = createId();
    await db.insert(appointments).values({ id, userId, title: title || 'Meeting', status: 'scheduled', startTime: normalizeSG(coerced.start), endTime: normalizeSG(coerced.end), timezone: TZ, inviteeName, inviteeEmail, inviteePhone });

    // Try Google Calendar if connected
    try {
      const accessToken = await ensureGoogleAccessToken(userId);
      if (accessToken) {
        const ev = await googleCreateEvent(accessToken, {
          summary: title || 'Meeting',
          description,
          start: normalizeSG(coerced.start),
          end: normalizeSG(coerced.end),
          attendees: inviteeEmail ? [{ email: inviteeEmail }] : undefined,
        });
        // Optionally we could store google event id by extending schema; skipped for now
      }
    } catch (e) {
      // Non-fatal; appointment remains in our DB
      console.warn('Google create event failed, kept local appointment:', e);
    }

    return NextResponse.json({ success: true, id });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';




