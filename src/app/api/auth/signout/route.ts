import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/lib/simple-auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session-token')?.value;

    if (token) {
      signOut(token);
    }

    const response = NextResponse.json({ success: true, message: 'Signed out successfully' });
    response.cookies.delete('session-token');
    
    return response;
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


