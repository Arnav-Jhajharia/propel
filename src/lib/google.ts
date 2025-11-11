import { db } from '@/lib/db';
import { accounts } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

function baseUrl(request?: Request): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, '');
  if (request) {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}`;
  }
  return 'http://localhost:3001';
}

export function getGoogleClientId(): string { const v = process.env.GOOGLE_CLIENT_ID || ''; if (!v) throw new Error('Missing GOOGLE_CLIENT_ID'); return v; }
export function getGoogleClientSecret(): string { const v = process.env.GOOGLE_CLIENT_SECRET || ''; if (!v) throw new Error('Missing GOOGLE_CLIENT_SECRET'); return v; }

export function googleAuthUrl(request?: Request, state?: string): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', getGoogleClientId());
  url.searchParams.set('redirect_uri', `${baseUrl(request)}/api/google/oauth/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  if (state) url.searchParams.set('state', state);
  return url.toString();
}

export async function googleExchangeCodeForToken(code: string, request?: Request): Promise<{ access_token: string; refresh_token?: string; expires_in?: number; id_token?: string; token_type?: string; }> {
  const params = new URLSearchParams({
    code,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    redirect_uri: `${baseUrl(request)}/api/google/oauth/callback`,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function googleRefreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in?: number; token_type?: string; }> {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!res.ok) throw new Error(`Google refresh failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getGoogleAccount(userId: string) {
  const rows = await db.select().from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'google'))).limit(1);
  return rows[0] || null;
}

export async function ensureGoogleAccessToken(userId: string): Promise<string | null> {
  const acc = await getGoogleAccount(userId);
  if (!acc) return null;
  const now = Date.now();
  const exp = acc.accessTokenExpiresAt ? new Date(acc.accessTokenExpiresAt).getTime() : 0;
  if (acc.accessToken && exp > now + 60_000) return acc.accessToken;
  if (!acc.refreshToken) return acc.accessToken || null;
  const refreshed = await googleRefreshAccessToken(acc.refreshToken);
  const newExp = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : undefined;
  await db.update(accounts).set({ accessToken: refreshed.access_token, accessTokenExpiresAt: newExp }).where(eq(accounts.id, acc.id));
  return refreshed.access_token;
}

export async function googleCreateEvent(accessToken: string, payload: {
  summary: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  attendees?: Array<{ email: string }>;
}): Promise<{ id: string }> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: payload.summary,
      description: payload.description,
      start: { dateTime: payload.start },
      end: { dateTime: payload.end },
      attendees: payload.attendees,
    }),
  });
  if (!res.ok) throw new Error(`Google event create failed: ${res.status} ${await res.text()}`);
  return res.json();
}





