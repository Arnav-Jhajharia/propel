import { NextRequest, NextResponse } from 'next/server';
import { db, appointments } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
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

    const rows = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.userId, userId)))
      .limit(200);

    const toMs = (s?: string | null) => {
      if (!s) return 0;
      const d = new Date(s);
      return d.getTime() || 0;
    };

    const sorted = rows.sort((a, b) => toMs(b.startTime) - toMs(a.startTime));
    return NextResponse.json({ events: sorted });
  } catch (error) {
    console.error('Get all scheduling events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';





