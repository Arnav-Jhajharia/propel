'use client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
  error?: string;
}

export async function signUp(email: string, password: string, name: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    return await response.json();
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    return await response.json();
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export async function signOut(): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/signout', {
      method: 'POST',
    });

    return await response.json();
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export async function getSession(): Promise<{ user: User | null }> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    });
    return await response.json();
  } catch (error) {
    return { user: null };
  }
}
