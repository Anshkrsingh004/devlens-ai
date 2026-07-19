import { withApiHandler } from "@/lib/api-handler";
import { errors } from "@/lib/errors";
import { requireSessionOrThrow } from "@/server/auth/guards";
import * as reviewService from "@/server/services/review.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reviews/[id]
 *
 * Returns 404 — never 403 — for a review owned by someone else. Ownership is
 * enforced inside the query, so a missing row and an unowned row are
 * indistinguishable and nothing leaks about which IDs exist.
 */
export const GET = withApiHandler<RouteContext>(async (_request, context) => {
  const session = await requireSessionOrThrow();
  const { id } = await context.params;

  const review = await reviewService.getReview(session.user.id, id);

  if (!review) throw errors.notFound("That review");

  return review;
});
