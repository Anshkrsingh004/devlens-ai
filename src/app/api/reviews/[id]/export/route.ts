import { reviewResultSchema } from "@/features/review/schemas/review-result.schema";
import {
  markdownFilename,
  toMarkdown,
} from "@/features/export/lib/to-markdown";
import { withApiHandler } from "@/lib/api-handler";
import { errors } from "@/lib/errors";
import { requireSessionOrThrow } from "@/server/auth/guards";
import * as reviewService from "@/server/services/review.service";

/**
 * GET /api/reviews/[id]/export?format=md
 *
 * Returns a file, not the JSON envelope — this response is a download, and
 * wrapping it would make the downloaded file contain JSON scaffolding.
 *
 * PDF is deliberately absent: it is generated client-side. Server-side PDF
 * needs headless Chromium, which exceeds Vercel's 250 MB bundle limit.
 */
export const GET = withApiHandler<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const session = await requireSessionOrThrow();
    const { id } = await context.params;

    const format = new URL(request.url).searchParams.get("format") ?? "md";
    if (format !== "md") {
      throw errors.validation("Only 'md' is supported.", { format });
    }

    const review = await reviewService.getReview(session.user.id, id);
    if (!review) throw errors.notFound("That review");

    const parsed = reviewResultSchema.safeParse(review.result);
    if (!parsed.success) {
      throw errors.validation("This review has no exportable report yet.");
    }

    const markdown = toMarkdown(parsed.data, {
      title: review.title,
      language: review.language,
      createdAt: review.createdAt,
      overallScore: review.overallScore,
    });

    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${markdownFilename(review.title, review.createdAt)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  },
);
