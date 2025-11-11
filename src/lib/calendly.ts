import crypto from 'crypto';

const CALENDLY_AUTH_BASE = 'https://auth.calendly.com/oauth';
const CALENDLY_API_BASE = 'https://api.calendly.com';

export function getCalendlyClientId(): string {
  const id = process.env.CALENDLY_CLIENT_ID || '';
  if (!id) throw new Error('Missing CALENDLY_CLIENT_ID');
  return id;
}

export function getCalendlyClientSecret(): string {
  const secret = process.env.CALENDLY_CLIENT_SECRET || '';
  if (!secret) throw new Error('Missing CALENDLY_CLIENT_SECRET');
  return secret;
}

export function getBaseUrl(request?: Request): string {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  if (request) {
    try {
      const url = new URL(request.url);
      return `${url.protocol}//${url.host}`;
    } catch {}
  }
  return 'http://localhost:3001';
}

export function calendlyOAuthAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getCalendlyClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'default',
    state,
  });
  return `${CALENDLY_AUTH_BASE}/authorize?${params.toString()}`;
}

export async function calendlyExchangeCodeForToken(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: getCalendlyClientId(),
    client_secret: getCalendlyClientSecret(),
  });
  const res = await fetch(`${CALENDLY_AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendly token exchange failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function calendlyGetCurrentUser(accessToken: string): Promise<{
  resource: { uri: string; name: string; slug?: string; scheduling_url?: string; current_organization?: string };
}> {
  const res = await fetch(`${CALENDLY_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendly users/me failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function calendlyCreateUserWebhook(
  accessToken: string,
  userUri: string,
  callbackUrl: string,
  signingKey?: string
): Promise<any> {
  const payload = {
    url: callbackUrl,
    events: ['invitee.created', 'invitee.canceled'],
    scope: 'user',
    user: userUri,
    signing_key: signingKey || undefined,
  } as any;
  const res = await fetch(`${CALENDLY_API_BASE}/webhook_subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendly webhook create failed: ${res.status} ${text}`);
  }
  return res.json();
}

export function verifyCalendlySignature(body: string, signatureHeader: string | null | undefined, signingKey: string | undefined): boolean {
  if (!signingKey) return true; // skip in dev if not configured
  if (!signatureHeader) return false;
  try {
    // Expected format: t=timestamp,v1=signature
    const parts = signatureHeader.split(',');
    const t = parts.find(p => p.startsWith('t='))?.slice(2);
    const v1 = parts.find(p => p.startsWith('v1='))?.slice(3);
    if (!t || !v1) return false;
    const payload = `${t}.${body}`;
    const hmac = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');
    // Constant-time compare
    return crypto.timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(hmac, 'hex'));
  } catch {
    return false;
  }
}

export function addQueryParams(url: string, params: Record<string, string | null | undefined>): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v) u.searchParams.set(k, v);
  }
  return u.toString();
}





