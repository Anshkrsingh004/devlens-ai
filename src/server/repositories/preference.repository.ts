import "server-only";

import type {
  Language,
  ReviewDepth,
  Theme,
  UserPreference,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Data access for user preferences.
 *
 * Kept in its own table rather than as columns on Better Auth's `user`, so
 * our schema is not coupled to their code generation (DATABASE.md §3.3).
 */

export interface UpdatePreferenceInput {
  theme?: Theme;
  defaultLanguage?: Language;
  reviewDepth?: ReviewDepth;
  includeRefactor?: boolean;
}

/** Read a user's preferences. Returns null before they have been created. */
export function findByUserId(userId: string): Promise<UserPreference | null> {
  return db.userPreference.findUnique({ where: { userId } });
}

/**
 * Return a user's preferences, creating the defaults row if it is missing.
 *
 * Sign-up creates this row (M2), so the create branch is defensive — it keeps
 * a missing row from turning into a broken settings page.
 */
export function findOrCreate(userId: string): Promise<UserPreference> {
  return db.userPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

/** Apply a partial update, creating the row first if it does not exist. */
export function update(
  userId: string,
  input: UpdatePreferenceInput,
): Promise<UserPreference> {
  return db.userPreference.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
  });
}
