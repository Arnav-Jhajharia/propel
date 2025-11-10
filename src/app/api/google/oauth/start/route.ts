import { NextRequest, NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { verifications } from '@/lib/db/schema';
import { googleAuthUrl } from '@/lib/google';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { getSession } from '@/lib/simple-auth';

export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null;
    try { const { userId: clerkUserId } = await clerkAuth(); if (clerkUserId) userId = clerkUserId; } catch {}
    if (!userId) {
      const token = request.headers.get('cookie')?.split('session-token=')[1]?.split(';')[0];
      if (token) { const session = await getSession(token); if (session?.user?.id) userId = session.user.id; }
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const state = createId();
    await db.insert(verifications).values({ id: createId(), identifier: `google_oauth_state:${userId}`, value: state, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
    const url = googleAuthUrl(request, state);
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';





