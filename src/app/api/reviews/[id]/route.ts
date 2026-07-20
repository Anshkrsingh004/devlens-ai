import { z } from "zod";

import { withApiHandler } from "@/lib/api-handler";
import { errors } from "@/lib/errors";
import { requireSessionOrThrow } from "@/server/auth/guards";
import * as reviewService from "@/server/services/review.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    isFavorite: z.boolean().optional(),
  })
  // An empty body is a client bug, not a no-op update worth a round trip.
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide a title or isFavorite to update.",
  });

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

/** PATCH /api/reviews/[id] — rename or toggle favorite. */
export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const session = await requireSessionOrThrow();
  const { id } = await context.params;
  const data = patchSchema.parse(await request.json().catch(() => ({})));

  return reviewService.updateReview(session.user.id, id, data);
});

/** DELETE /api/reviews/[id] */
export const DELETE = withApiHandler<RouteContext>(
  async (_request, context) => {
    const session = await requireSessionOrThrow();
    const { id } = await context.params;

    return reviewService.deleteReview(session.user.id, id);
  },
);
