import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

export default clerkMiddleware(async (auth, req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Skip for public assets and auth pages
  const publicPaths = ['/sign-in', '/sign-up', '/onboarding', '/api', '/wa-embedded-signup'];
  if (publicPaths.some((p) => path.startsWith(p)) || path.startsWith('/_next') || path.includes('.')) {
    return NextResponse.next();
  }

  const { userId } = auth();
  if (!userId) return NextResponse.next();

  try {
    const user = await clerkClient.users.getUser(userId);
    const pm: any = user.privateMetadata || {};
    const hasWhatsapp = Boolean(pm.whatsappPhoneId && pm.whatsappToken);
    const skipUntil = Number(pm.onboardingSkipUntil || 0);
    const skipActive = Number.isFinite(skipUntil) && skipUntil > Date.now();

    if (!hasWhatsapp && !skipActive && path !== '/onboarding') {
      const to = new URL('/onboarding', req.url);
      return NextResponse.redirect(to);
    }
    if ((hasWhatsapp || skipActive) && path === '/onboarding') {
      const to = new URL('/', req.url);
      return NextResponse.redirect(to);
    }
  } catch {
    // if error, allow navigation rather than block
  }

  return NextResponse.next();
});

export const config = {
  // Exclude static and the standalone WA signup path to allow serving index.html directly
  matcher: ['/((?!_next|.*\\..*|wa-embedded-signup).*)'],
};


