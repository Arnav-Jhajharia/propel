import { NextRequest, NextResponse } from 'next/server';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { getSession } from '@/lib/simple-auth';

export async function GET(request: NextRequest) {
  let userId: string | null = null;
  let authMethod = 'none';
  
  try {
    const { userId: clerkUserId } = await clerkAuth();
    if (clerkUserId) {
      userId = clerkUserId;
      authMethod = 'clerk';
    }
  } catch {}
  
  if (!userId) {
    const token = request.headers.get('cookie')?.split('session-token=')[1]?.split(';')[0];
    if (token) {
      const session = await getSession(token);
      if (session?.user?.id) {
        userId = session.user.id;
        authMethod = 'simple-auth';
      }
    }
  }

  return NextResponse.json({ 
    userId, 
    authMethod,
    authenticated: !!userId 
  });
}

