import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/simple-auth';
import { auth as clerkAuth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = clerkAuth();
      if (clerkUserId) userId = clerkUserId;
    } catch {}
    if (!userId) {
      const token = request.headers.get('cookie')?.split('session-token=')[1]?.split(';')[0];
      if (token) {
        const session = await getSession(token);
        if (session?.user?.id) userId = session.user.id;
      }
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const user = userRows[0];
    return NextResponse.json({ calendlyUrl: user.calendlyUrl || null });
  } catch (error) {
    console.error('Calendly GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = clerkAuth();
      if (clerkUserId) userId = clerkUserId;
    } catch {}
    if (!userId) {
      const token = request.headers.get('cookie')?.split('session-token=')[1]?.split(';')[0];
      if (token) {
        const session = await getSession(token);
        if (session?.user?.id) userId = session.user.id;
      }
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { calendlyUrl } = await request.json();
    if (typeof calendlyUrl !== 'string' || !/^https?:\/\/(?:www\.)?calendly\.com\/.+/.test(calendlyUrl)) {
      return NextResponse.json({ error: 'Invalid Calendly URL' }, { status: 400 });
    }

    await db.update(users).set({ calendlyUrl: calendlyUrl.trim() }).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Calendly POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';


