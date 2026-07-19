import { withApiHandler } from "@/lib/api-handler";
import { requireSessionOrThrow } from "@/server/auth/guards";
import * as quotaService from "@/server/services/quota.service";

/**
 * GET /api/usage — remaining daily quota.
 *
 * Surfacing the free-tier ceiling is a deliberate UX decision: hiding it
 * produces a baffling 429 at an unpredictable moment, while showing it lets
 * the user plan.
 */
export const GET = withApiHandler(async () => {
  const session = await requireSessionOrThrow();
  return quotaService.getStatus(session.user.id);
});
