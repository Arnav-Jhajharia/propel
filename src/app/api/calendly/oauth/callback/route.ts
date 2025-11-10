import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { accounts, users, verifications } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { calendlyExchangeCodeForToken, calendlyGetCurrentUser, calendlyCreateUserWebhook, getBaseUrl } from '@/lib/calendly';
import { getSession } from '@/lib/simple-auth';
import { auth as clerkAuth, clerkClient } from '@clerk/nextjs/server';
import { createId } from '@paralleldrive/cuid2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect('/integrations?error=Missing authorization response');
  }

  try {
    // Determine user id (Clerk preferred, fallback to simple-auth)
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = await clerkAuth();
      if (clerkUserId) userId = clerkUserId;
    } catch {}
    if (!userId) {
      const token = request.headers.get('cookie')?.split('session-token=')[1]?.split(';')[0];
      if (token) {
        const session = await getSession(token);
        if (session?.user?.id) userId = session.user.id;
      }
    }
    if (!userId) return NextResponse.redirect('/integrations?error=Unauthorized');

    // Ensure a local user record exists for FK constraints
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existingUser.length === 0) {
      let email = `user-${userId}@example.com`;
      let name = 'Agent';
      let image: string | undefined = undefined;
      try {
        const u = await clerkClient.users.getUser(userId);
        email = u?.primaryEmailAddress?.emailAddress || email;
        name = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || u?.username || email;
        image = u?.imageUrl || undefined;
      } catch {}
      try {
        await db.insert(users).values({ id: userId, email, name, image, role: 'agent' });
      } catch {}
    }

    // Validate state
    const stateRows = await db
      .select()
      .from(verifications)
      .where(eq(verifications.identifier, `calendly_oauth_state:${userId}`))
      .orderBy(desc(verifications.createdAt))
      .limit(1);
    if (stateRows.length === 0 || stateRows[0].value !== state || new Date(stateRows[0].expiresAt) < new Date()) {
      return NextResponse.redirect('/integrations?error=Invalid state');
    }
    // Invalidate state (single-use)
    try { await db.delete(verifications).where(eq(verifications.id, stateRows[0].id)); } catch {}

    const base = getBaseUrl(request);
    const redirectUri = `${base}/api/calendly/oauth/callback`;
    const tokenSet = await calendlyExchangeCodeForToken(code, redirectUri);

    // Get Calendly user data
    const me = await calendlyGetCurrentUser(tokenSet.access_token);
    const userUri = me.resource.uri;
    const schedulingUrl = me.resource.scheduling_url;

    // Upsert account record
    const existing = await db.select().from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'calendly'))).limit(1);
    if (existing.length === 0) {
      await db.insert(accounts).values({
        id: createId(),
        userId: userId,
        accountId: userUri,
        providerId: 'calendly',
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        accessTokenExpiresAt: tokenSet.expires_in ? new Date(Date.now() + tokenSet.expires_in * 1000).toISOString() : undefined,
        scope: 'default',
      });
    } else {
      await db.update(accounts).set({
        accountId: userUri,
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        accessTokenExpiresAt: tokenSet.expires_in ? new Date(Date.now() + tokenSet.expires_in * 1000).toISOString() : null,
        updatedAt: new Date().toISOString(),
      }).where(eq(accounts.id, existing[0].id));
    }

    // Save scheduling URL on user
    if (schedulingUrl) {
      await db.update(users).set({ calendlyUrl: schedulingUrl }).where(eq(users.id, userId));
    }

    // Create webhook subscription for this user
    try {
      const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY || undefined;
      const callbackUrl = `${base}/api/calendly/webhook?userId=${encodeURIComponent(userId)}`;
      await calendlyCreateUserWebhook(tokenSet.access_token, userUri, callbackUrl, signingKey);
    } catch (e) {
      console.warn('Calendly webhook creation failed (continuing):', e);
    }

    return NextResponse.redirect(new URL('/integrations?success=Calendly connected!', base));
  } catch (error: any) {
    console.error('Calendly OAuth callback error:', error);
    const base = getBaseUrl(request);
    const message = typeof error?.message === 'string' ? error.message : 'Calendly connection failed';
    return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(message)}`, base));
  }
}

export const dynamic = 'force-dynamic';


