import { reviewInputSchema } from "@/features/review/schemas/review-input.schema";
import { ApiResponse, withApiHandler } from "@/lib/api-handler";
import { requireSessionOrThrow } from "@/server/auth/guards";
import * as reviewService from "@/server/services/review.service";

/**
 * Vercel's ceiling is 300s. The M3 spike measured ~4s for a short function,
 * but reasoning tokens scale with difficulty, so the headroom is real rather
 * than decorative.
 */
export const maxDuration = 300;

/** POST /api/reviews — create and run a review. */
export const POST = withApiHandler(async (request) => {
  const session = await requireSessionOrThrow();
  const body = await request.json().catch(() => ({}));

  // Throws ZodError, which withApiHandler maps to 422 with field details.
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
