import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/simple-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await signIn(email, password);

    if (result.success && result.session) {
      // Set session cookie
      const response = NextResponse.json({ 
        success: true, 
        user: result.session.user,
        message: 'Signed in successfully' 
      });
      
      response.cookies.set('session-token', result.session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    } else {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
