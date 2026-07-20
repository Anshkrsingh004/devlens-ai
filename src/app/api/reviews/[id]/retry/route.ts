import { ApiResponse, withApiHandler } from "@/lib/api-handler";
import { requireSessionOrThrow } from "@/server/auth/guards";
import * as reviewService from "@/server/services/review.service";

export const maxDuration = 300;

/**
 * POST /api/reviews/[id]/retry — re-run a FAILED review.
 *
 * Consumes quota: it is a real Groq call against the same daily allowance.
 * Making retries free would let a failure loop exhaust the shared budget.
 */
export const POST = withApiHandler<{ params: Promise<{ id: string }> }>(
  async (_request, context) => {
    const session = await requireSessionOrThrow();
    const { id } = await context.params;

    const { review, quota } = await reviewService.retryReview(
      session.user.id,
      id,
    );

    return new ApiResponse(
      {
        id: review.id,
        status: review.status,
        overallScore: review.overallScore,
        result: review.result,
        quota,
      },
      { status: 201 },
    );
  },
);
