import { db } from './db';
import { users, sessions } from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Session {
  user: User;
  token: string;
}

// Database-based session store

export async function signUp(email: string, password: string, name: string): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length > 0) {
      return { success: false, error: 'User already exists' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db.insert(users).values({
      id: createId(),
      email,
      name,
      role: 'agent',
    }).returning();

    // Store password in accounts table (simplified)
    await db.insert(accounts).values({
      id: createId(),
      userId: newUser.id,
      accountId: newUser.id,
      providerId: 'email',
      password: hashedPassword,
    });

    return { success: true, user: newUser };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: 'Failed to create user' };
  }
}

export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string; session?: Session }> {
  try {
    // Get user
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (user.length === 0) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Get password
    const account = await db.select().from(accounts).where(eq(accounts.userId, user[0].id)).limit(1);
    
    if (account.length === 0 || !account[0].password) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const isValid = await bcrypt.compare(password, account[0].password);
    
    if (!isValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Create session
    const token = createId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    // Store session in database
    await db.insert(sessions).values({
      id: createId(),
      userId: user[0].id,
      token,
      expiresAt: expiresAt.toISOString(),
    });

    const session: Session = {
      user: user[0],
      token,
    };

    return { success: true, session };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: 'Failed to sign in' };
  }
}

export async function getSession(token: string): Promise<Session | null> {
  try {
    // Get session from database
    const sessionData = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        token: sessions.token,
        expiresAt: sessions.expiresAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        }
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.token, token))
      .limit(1);

    if (sessionData.length === 0) {
      return null;
    }

    const sessionRecord = sessionData[0];
    
    // Check if session is expired
    if (new Date(sessionRecord.expiresAt) < new Date()) {
      // Delete expired session
      await db.delete(sessions).where(eq(sessions.id, sessionRecord.id));
      return null;
    }

    return {
      user: sessionRecord.user,
      token: sessionRecord.token,
    };
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

export async function signOut(token: string): Promise<void> {
  try {
    await db.delete(sessions).where(eq(sessions.token, token));
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

// Import accounts table
import { accounts } from './db/schema';
