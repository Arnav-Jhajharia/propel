import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/lib/simple-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await signUp(email, password, name);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        user: result.user,
        message: 'User created successfully' 
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


