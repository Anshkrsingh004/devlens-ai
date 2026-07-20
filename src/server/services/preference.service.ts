import "server-only";

import type { Language, ReviewDepth, Theme } from "@/generated/prisma/client";
import * as preferenceRepository from "@/server/repositories/preference.repository";

/**
 * User preferences.
 *
 * Thin by design — preferences have no business rules beyond "read them" and
 * "write them". The service exists so route handlers never touch a repository
 * directly, keeping the layer boundary intact for when rules do appear.
 */

export interface UpdatePreferenceInput {
  theme?: Theme;
  defaultLanguage?: Language;
  reviewDepth?: ReviewDepth;
  includeRefactor?: boolean;
}

export function getPreferences(userId: string) {
  return preferenceRepository.findOrCreate(userId);
}

export function updatePreferences(
  userId: string,
  input: UpdatePreferenceInput,
) {
  return preferenceRepository.update(userId, input);
}
