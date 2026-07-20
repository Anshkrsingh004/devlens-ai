"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { ParsedReviewInput } from "../schemas/review-input.schema";
import type { ReviewResult } from "../schemas/review-result.schema";

export interface CreateReviewResponse {
  id: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  title: string;
  language: string;
  overallScore: number | null;
  createdAt: string;
  result: ReviewResult;
  quota: {
    used: number;
    limit: number;
    remaining: number;
    tokensUsed: number;
    resetAt: string;
  };
}

export type CreateReviewInput = Pick<
  ParsedReviewInput,
  "language" | "sourceCode" | "sourceType"
>;

/**
 * Create a review.
 *
 * Retries are disabled for mutations globally because each attempt consumes
 * the user's daily quota — an automatic retry could spend two of ten reviews
 * on a single click.
 */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReviewInput) =>
      apiRequest<CreateReviewResponse>("/api/reviews", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      // The quota meter and the (M5) history list are both now stale.
      void queryClient.invalidateQueries({ queryKey: queryKeys.usage });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
}
