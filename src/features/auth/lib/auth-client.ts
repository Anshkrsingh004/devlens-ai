"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth client.
 *
 * No baseURL is configured: Better Auth defaults to the current origin, which
 * is correct in every environment — localhost, Vercel preview deployments
 * with their rotating URLs, and production — without a build-time constant
 * that could drift out of sync with where the app is actually served.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
