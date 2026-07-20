import { z } from "zod";

import { LANGUAGES } from "@/config/languages";
import { withApiHandler } from "@/lib/api-handler";
import { requireSessionOrThrow } from "@/server/auth/guards";
import * as preferenceService from "@/server/services/preference.service";

const patchSchema = z
  .object({
    theme: z.enum(["LIGHT", "DARK", "SYSTEM"]).optional(),
    defaultLanguage: z.enum(LANGUAGES).optional(),
    reviewDepth: z.enum(["CONCISE", "BALANCED", "THOROUGH"]).optional(),
    includeRefactor: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one preference to update.",
  });

/** GET /api/preferences — creates defaults on first read. */
export const GET = withApiHandler(async () => {
  const session = await requireSessionOrThrow();
  return preferenceService.getPreferences(session.user.id);
});

/** PATCH /api/preferences — partial update. */
export const PATCH = withApiHandler(async (request) => {
  const session = await requireSessionOrThrow();
  const data = patchSchema.parse(await request.json().catch(() => ({})));

  return preferenceService.updatePreferences(session.user.id, data);
});
