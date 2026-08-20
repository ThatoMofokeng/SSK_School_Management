import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { routeAccessMap } from './lib/setting';
import { NextResponse } from 'next/server';

const matchers = Object.keys(routeAccessMap).map((route) => ({
  matcher: createRouteMatcher([route]),
  allowedRoles: routeAccessMap[route],
}));

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims } = await auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  for (const { matcher, allowedRoles } of matchers) {
    if (!matcher(req)) continue;

    // No role on the session yet (e.g. brand-new account before an admin
    // assigns one) — previously this fell through to `role!` and produced
    // a redirect to the broken, non-interpolated path "/${role}".
    if (!role) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    if (!allowedRoles.includes(role)) {
      // Bug fix: the original used single quotes ('/${role}'), so ${role}
      // was never interpolated and every unauthorized user was redirected
      // to the literal, non-existent path "/${role}". This must be a
      // template literal.
      return NextResponse.redirect(new URL(`/${role}`, req.url));
    }
  }

  // Mark announcements as "seen" the moment the list page is requested.
  // Doing this here (server-side, in the same response) rather than via
  // a client-side effect avoids a race with Next.js Link prefetching:
  // a prefetched detail page could otherwise render with the navbar's
  // old (pre-seen) unread count baked in before the client had a chance
  // to set the cookie.
  if (req.nextUrl.pathname === '/list/announcements') {
    const res = NextResponse.next();
    res.cookies.set('announcementsLastSeenAt', new Date().toISOString(), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return res;
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};