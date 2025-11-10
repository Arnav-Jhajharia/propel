import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { ensureGoogleAccessToken, googleCreateEvent } from "@/lib/google";

export type CreateAppointmentArgs = {
  title?: string;
  description?: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  inviteeName?: string;
  inviteeEmail?: string;
  inviteePhone?: string;
};

export async function createAppointment(userId: string, args: CreateAppointmentArgs): Promise<{ id: string; createdGoogle?: boolean }>
{
  const TZ = 'Asia/Singapore';
  const sgOffsetMs = 8 * 60 * 60 * 1000; // UTC+8
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

  const coerceToTomorrowIfPast = (startIso: string, endIso?: string): { start: string; end?: string } => {
    const now = new Date();
    const startMs = Date.parse(startIso);
    const endMs = endIso ? Date.parse(endIso) : NaN;
    const duration = Number.isFinite(endMs) && Number.isFinite(startMs) ? Math.max(15 * 60 * 1000, endMs - startMs) : 60 * 60 * 1000;

    if (!Number.isFinite(startMs) || startMs < now.getTime()) {
      const hh = (startIso.match(/T(\d{2})/) || [,'15'])[1];
      const mm = (startIso.match(/T\d{2}:(\d{2})/) || [,'00'])[1];
      const ss = (startIso.match(/T\d{2}:\d{2}:(\d{2})/) || [,'00'])[1];
      const nowSg = new Date(now.getTime() + sgOffsetMs);
      nowSg.setDate(nowSg.getDate() + 1); // tomorrow in SG
      const y = nowSg.getUTCFullYear();
      const m = nowSg.getUTCMonth() + 1;
      const d = nowSg.getUTCDate();
      // Build epoch for  HH:MM:SS at tomorrow SG
      const startEpoch = Date.UTC(y, m - 1, d, Number(hh), Number(mm), Number(ss)) - sgOffsetMs;
      const endEpoch = startEpoch + duration;
      const start = formatSg(startEpoch);
      const end = formatSg(endEpoch);
      return { start, end };
    }
    return { start: startIso, end: endIso };
  };
  const normalizeSG = (s: string): string => {
    if (!s) return s;
    // If no timezone info present, append +08:00 (SGT)
    if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
      // Ensure seconds exist (optional)
      const needsSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s);
      const base = needsSeconds ? `${s}:00` : s;
      return `${base}+08:00`;
    }
    return s;
  };

  const coerced = coerceToTomorrowIfPast(args.startTime, args.endTime);

  const id = createId();
  await db.insert(appointments).values({
    id,
    userId,
    title: args.title || 'Meeting',
    status: 'scheduled',
    startTime: normalizeSG(coerced.start),
    endTime: normalizeSG(coerced.end || args.endTime),
    timezone: TZ,
    inviteeName: args.inviteeName,
    inviteeEmail: args.inviteeEmail,
    inviteePhone: args.inviteePhone,
  });

  let createdGoogle = false;
  try {
    const accessToken = await ensureGoogleAccessToken(userId);
    if (accessToken) {
      await googleCreateEvent(accessToken, {
        summary: args.title || 'Meeting',
        description: args.description,
        start: normalizeSG(coerced.start),
        end: normalizeSG(coerced.end || args.endTime),
        attendees: args.inviteeEmail ? [{ email: args.inviteeEmail }] : undefined,
      });
      createdGoogle = true;
    }
  } catch {
    // keep local appointment regardless
  }

  return { id, createdGoogle };
}




