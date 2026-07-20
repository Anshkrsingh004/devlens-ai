import { z } from "zod";

import { LANGUAGES } from "@/config/languages";
import { reviewInputSchema } from "@/features/review/schemas/review-input.schema";
import { ApiResponse, withApiHandler } from "@/lib/api-handler";
import { requireSessionOrThrow } from "@/server/auth/guards";
import * as reviewService from "@/server/services/review.service";

export const maxDuration = 300;

const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  language: z.enum(LANGUAGES).optional(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED"]).optional(),
  favorite: z.enum(["true", "false"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** GET /api/reviews — cursor-paginated list, newest first. */
export const GET = withApiHandler(async (request) => {
  const session = await requireSessionOrThrow();

  const params = listQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  return reviewService.listReviews(session.user.id, {
    search: params.q || undefined,
    language: params.language,
    status: params.status,
    favoritesOnly: params.favorite === "true",
    cursor: params.cursor,
    limit: params.limit,
  });
});

/** POST /api/reviews — create and run a review. */
export const POST = withApiHandler(async (request) => {
  const session = await requireSessionOrThrow();
  const body = await request.json().catch(() => ({}));
  const input = reviewInputSchema.parse(body);

  const { review, quota } = await reviewService.createReview(
    session.user.id,
    input,
  );

  return new ApiResponse(
    {
      id: review.id,
      status: review.status,
      title: review.title,
      language: review.language,
      overallScore: review.overallScore,
      createdAt: review.createdAt,
      result: review.result,
      quota,
    },
    { status: 201 },
  );
});
