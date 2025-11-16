import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { accounts, users, verifications } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { googleExchangeCodeForToken } from '@/lib/google';
import { auth as clerkAuth, clerkClient } from '@clerk/nextjs/server';
import { getSession } from '@/lib/simple-auth';
import { createId } from '@paralleldrive/cuid2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code || !state) return NextResponse.redirect(new URL('/integrations?error=Missing Google auth response', request.url));

  try {
    let userId: string | null = null;
    try { const { userId: clerkUserId } = await clerkAuth(); if (clerkUserId) userId = clerkUserId; } catch {}
    if (!userId) { const token = request.headers.get('cookie')?.split('session-token=')[1]?.split(';')[0]; if (token) { const session = await getSession(token); if (session?.user?.id) userId = session.user.id; } }
    if (!userId) return NextResponse.redirect(new URL('/integrations?error=Unauthorized', request.url));

    // Validate state
    const s = await db.select().from(verifications).where(eq(verifications.identifier, `google_oauth_state:${userId}`)).orderBy(desc(verifications.createdAt)).limit(1);
    if (s.length === 0 || s[0].value !== state || new Date(s[0].expiresAt) < new Date()) {
      return NextResponse.redirect(new URL('/integrations?error=Invalid state', request.url));
    }
    try { await db.delete(verifications).where(eq(verifications.id, s[0].id)); } catch {}

    // Ensure user row exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existingUser.length === 0) {
      let email = `user-${userId}@example.com`; let name = 'Agent'; let image: string | undefined;
      try { const u = await clerkClient.users.getUser(userId); email = u?.primaryEmailAddress?.emailAddress || email; name = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || u?.username || email; image = u?.imageUrl || undefined; } catch {}
      try { await db.insert(users).values({ id: userId, email, name, image, role: 'agent' }); } catch {}
    }

    const tokens = await googleExchangeCodeForToken(code, request);
    const accessExp = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : undefined;

    const existing = await db.select().from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'google'))).limit(1);
    if (existing.length === 0) {
      await db.insert(accounts).values({ id: createId(), userId, accountId: 'primary', providerId: 'google', accessToken: tokens.access_token, refreshToken: tokens.refresh_token, accessTokenExpiresAt: accessExp, scope: 'calendar.events' });
    } else {
      await db.update(accounts).set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? existing[0].refreshToken, accessTokenExpiresAt: accessExp, updatedAt: new Date().toISOString() }).where(eq(accounts.id, existing[0].id));
    }

    return NextResponse.redirect(new URL('/integrations?success=Google Calendar connected!', request.url));
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(e?.message || 'Google connect failed')}`, request.url));
  }
}

export const dynamic = 'force-dynamic';





