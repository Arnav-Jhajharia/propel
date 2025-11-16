import { NextRequest, NextResponse } from 'next/server';
import { db, appointments } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/simple-auth';
import { auth as clerkAuth } from '@clerk/nextjs/server';

async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const { userId } = await clerkAuth();
    if (userId) return userId;
  } catch {}
  const token = request.headers.get('cookie')?.split('session-token=')[1]?.split(';')[0];
  if (token) {
    const session = await getSession(token);
    if (session?.user?.id) return session.user.id;
  }
  return null;
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await ctx.params;
    const body = await request.json();
    const allowed: any = {};
    const fields = [
      'title','description','startTime','endTime','timezone','location','notes',
      'inviteeName','inviteeEmail','inviteePhone','status','propertyId'
    ];
    for (const k of fields) if (k in body) allowed[k] = body[k];
    allowed.updatedAt = new Date().toISOString();
    await db.update(appointments).set(allowed).where(and(eq(appointments.id, id), eq(appointments.userId, userId)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await ctx.params;
    // soft-cancel instead of delete
    await db.update(appointments).set({ status: 'canceled', updatedAt: new Date().toISOString() }).where(and(eq(appointments.id, id), eq(appointments.userId, userId)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';





