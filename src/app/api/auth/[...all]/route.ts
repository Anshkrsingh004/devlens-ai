import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/server/auth/auth";

/**
 * Better Auth mounts every authentication endpoint under /api/auth/*:
 * sign-up, sign-in, sign-out, session lookup, and the Google OAuth callback.
 *
 * We implement none of them — delegating means password hashing, session
 * rotation, CSRF protection and the OAuth handshake are handled by a library
 * that specialises in getting them right.
 */
export const { GET, POST } = toNextJsHandler(auth);
