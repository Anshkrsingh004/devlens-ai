import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type Session } from "@/server/auth/auth";

/**
 * Session guards.
 *
 * **This is the real security boundary.** `middleware.ts` only performs an
 * optimistic cookie check to make redirects feel fast — a cookie can be
 * forged, and middleware never validates it against the database. Every
 * protected route handler and every server component that reads user data
 * must call one of these instead.
 *
 * Stated explicitly here so it is never "optimised away" by someone who
 * notices that middleware appears to already handle it.
 */

/** Read the current session, or null when signed out. Never throws. */
export async function getOptionalSession(): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session ?? null;
}

/**
 * Require an authenticated session in a Server Component or page.
 *
 * Redirects to sign-in when absent. Use this in pages and layouts; use
 * `requireSessionOrThrow` in route handlers, where a redirect is the wrong
 * response to an API call.
 */
export async function requireSession(): Promise<Session> {
  const session = await getOptionalSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

/** Thrown when an API request has no valid session. Mapped to 401 in M3. */
export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED";

  constructor() {
    super("Authentication required");
    this.name = "UnauthorizedError";
  }
}

/**
 * Require an authenticated session inside a route handler.
 *
 * Throws rather than redirecting: an API client needs a 401 it can act on,
 * not an HTML redirect it will not understand.
 */
export async function requireSessionOrThrow(): Promise<Session> {
  const session = await getOptionalSession();

  if (!session) {
    throw new UnauthorizedError();
  }

  return session;
}
