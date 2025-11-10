import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/simple-auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('cookie')?.split('session-token=')[1]?.split(';')[0];
    
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const session = await getSession(token);
    
    if (!session) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: session.user });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null });
  }
}