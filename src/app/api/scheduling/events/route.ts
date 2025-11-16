import { NextRequest, NextResponse } from 'next/server';
import { db, appointments } from '@/lib/db';
import { and, eq, gte } from 'drizzle-orm';
import { getSession } from '@/lib/simple-auth';
import { auth as clerkAuth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
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
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const rows = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.userId, userId)))
      .limit(50);

    // Filter upcoming: from now to 30 days ahead; robust date parsing
    const toMs = (s?: string | null) => {
      if (!s) return NaN;
      const d = new Date(s);
      return d.getTime();
    };
    const upcoming = rows
      .filter(r => {
        if (r.status === 'canceled') return false;
        const ms = toMs(r.startTime);
        return Number.isFinite(ms) && ms >= now.getTime() && ms <= in30Days.getTime();
      })
      .sort((a, b) => (toMs(a.startTime) - toMs(b.startTime)));

    return NextResponse.json({ events: upcoming });
  } catch (error) {
    console.error('Get scheduling events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';


