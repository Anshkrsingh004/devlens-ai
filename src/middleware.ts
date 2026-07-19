import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth redirect.
 *
 * **This is NOT a security boundary.** It only checks whether a session
 * cookie is present — it does not validate the signature, look the session up
 * in the database, or check expiry. A forged cookie passes this check.
 *
 * Its only job is to spare a signed-out visitor a round trip that would
 * render a protected page shell and then redirect. The actual enforcement
 * lives in `requireSession()` (server components) and
 * `requireSessionOrThrow()` (route handlers), which every protected surface
 * calls independently.
 *
 * Better Auth documents this pattern precisely because validating sessions in
 * middleware would mean a database call on every request, including static
 * assets.
 */
export function middleware(request: NextRequest) {
  const hasSessionCookie = getSessionCookie(request);

  if (!hasSessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    // Preserve the destination so the user lands where they intended after
    // signing in, rather than always on the dashboard.
    signInUrl.searchParams.set("next", request.nextUrl.pathname);

    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only protected routes. Everything else — the landing page, auth pages,
  // and /api/auth itself — must stay reachable while signed out.
  matcher: ["/dashboard/:path*", "/review/:path*", "/settings/:path*"],
};
