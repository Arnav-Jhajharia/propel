import { NextRequest, NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';
import { db, verifications } from '@/lib/db';
import { calendlyOAuthAuthorizeUrl, getBaseUrl } from '@/lib/calendly';
import { getSession } from '@/lib/simple-auth';
import { auth as clerkAuth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    // Try Clerk first
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = await clerkAuth();
      if (clerkUserId) userId = clerkUserId;
    } catch {}
    // Fallback to simple-auth session
    if (!userId) {
      const token = request.headers.get('cookie')?.split('session-token=')[1]?.split(';')[0];
      if (token) {
        const session = await getSession(token);
        if (session?.user?.id) userId = session.user.id;
      }
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const state = createId();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await db.insert(verifications).values({
      id: createId(),
      identifier: `calendly_oauth_state:${userId}`,
      value: state,
      expiresAt,
    });

    const base = getBaseUrl(request);
    const redirectUri = `${base}/api/calendly/oauth/callback`;
    const url = calendlyOAuthAuthorizeUrl(redirectUri, state);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Calendly OAuth start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';


