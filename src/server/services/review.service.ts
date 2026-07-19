import "server-only";

import type { Review } from "@/generated/prisma/client";
import type { ParsedReviewInput } from "@/features/review/schemas/review-input.schema";
import { reviewResultSchema } from "@/features/review/schemas/review-result.schema";
import { errors, isAppError } from "@/lib/errors";
import { requestReview } from "@/server/ai/groq-client";
import { buildSystemPrompt, buildUserPrompt } from "@/server/ai/prompt-builder";
import { assertWithinBudget } from "@/server/ai/token-budget";
import * as preferenceRepository from "@/server/repositories/preference.repository";
import * as reviewRepository from "@/server/repositories/review.repository";
import * as quotaService from "@/server/services/quota.service";

/**
 * Review orchestration — all business logic for creating a review.
 *
 * Order of operations is deliberate: the cheapest checks run first, so a
 * request that cannot succeed never reaches the expensive parts.
 *
 *   1. quota      (one indexed read)
 *   2. budget     (pure arithmetic)
 *   3. persist    PENDING row, BEFORE the AI call
 *   4. AI call
 *   5. validate   the model's output against the shared schema
 *   6. complete   + record usage
 *
 * Step 3 is the important one. If the connection drops mid-review the row
 * survives as PENDING or FAILED, appears in history, and can be retried —
 * roughly a job queue's resilience for the cost of one INSERT.
 */

/** A fallback title when the user does not supply one. */
function deriveTitle(input: ParsedReviewInput): string {
  if (input.title) return input.title;

  const firstMeaningfulLine = input.sourceCode
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line.length > 0 && !line.startsWith("//") && !line.startsWith("#"),
    );

  if (!firstMeaningfulLine) return "Untitled review";

  return firstMeaningfulLine.slice(0, 60);
}

export interface CreateReviewResult {
  review: Review;
  quota: quotaService.QuotaStatus;
}

export async function createReview(
  userId: string,
  input: ParsedReviewInput,
): Promise<CreateReviewResult> {
  await quotaService.assertWithinQuota(userId);
  assertWithinBudget(input.sourceCode);

  const preference = await preferenceRepository.findOrCreate(userId);

  const review = await reviewRepository.createPending({
    userId,
    title: deriveTitle(input),
    language: input.language,
    sourceCode: input.sourceCode,
    sourceType: input.sourceType,
  });

  return runReview(userId, review, {
    depth: preference.reviewDepth,
    includeRefactor: preference.includeRefactor,
  });
}

/**
 * Re-run a review that previously failed, reusing its stored source.
 *
 * Updates the existing row rather than creating a new one, so history stays
 * clean and token metrics reflect total spend across attempts.
 */
export async function retryReview(
  userId: string,
  reviewId: string,
): Promise<CreateReviewResult> {
  const existing = await reviewRepository.findById(reviewId, userId);

  if (!existing) throw errors.notFound("That review");

  if (existing.status !== "FAILED") {
    throw errors.validation("Only failed reviews can be retried.");
  }

  await quotaService.assertWithinQuota(userId);

  const preference = await preferenceRepository.findOrCreate(userId);

  return runReview(userId, existing, {
    depth: preference.reviewDepth,
    includeRefactor: preference.includeRefactor,
  });
}

interface RunOptions {
  depth: "CONCISE" | "BALANCED" | "THOROUGH";
  includeRefactor: boolean;
}

/**
 * Execute the AI call for an already-persisted review and record the outcome.
 *
 * Every failure path marks the row FAILED with a taxonomy code before
 * rethrowing, so a failed review is always visible and retryable rather than
 * silently lost.
 */
const MAX_RETRY_WAIT_MS = 20_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One bounded retry, and only for failures a retry can actually fix.
 *
 * - 429: the provider told us to wait, so waiting is a real remedy.
 * - Malformed output: a second sampling pass often produces valid JSON.
 *
 * Retries are capped at one. Beyond that the request is likely to fail again
 * while holding the serverless function open and burning the shared daily
 * token allowance — the user is better served by a FAILED row they can retry
 * deliberately.
 */
async function callWithOneRetry(
  systemPrompt: string,
  userPrompt: string,
): Promise<ReturnType<typeof requestReview>> {
  try {
    return await requestReview({ systemPrompt, userPrompt });
  } catch (error) {
    if (!isAppError(error) || error.code !== "AI_RATE_LIMITED") throw error;

    const retryAfter = Number(error.details?.retryAfterSeconds ?? 1);
    const waitMs = Math.min(retryAfter * 1000, MAX_RETRY_WAIT_MS);

    await sleep(waitMs);
    return requestReview({ systemPrompt, userPrompt });
  }
}

async function runReview(
  userId: string,
  review: Review,
  options: RunOptions,
): Promise<CreateReviewResult> {
  try {
    const systemPrompt = buildSystemPrompt(options.depth);
    const userPrompt = buildUserPrompt({
      language: review.language,
      sourceCode: review.sourceCode,
      includeRefactor: options.includeRefactor,
    });

    let response = await callWithOneRetry(systemPrompt, userPrompt);

    // Trust nothing the model returns. Strict mode makes this unlikely, but
    // "unlikely" is not "impossible", and a malformed payload reaching the UI
    // would crash the render rather than show a retry.
    let parsed = reviewResultSchema.safeParse(response.content);

    if (!parsed.success) {
      // One repair attempt, naming the fields that failed. A second sampling
      // pass with explicit corrective guidance usually succeeds.
      const failedPaths = parsed.error.issues
        .map((issue) => issue.path.join("."))
        .filter(Boolean)
        .slice(0, 8)
        .join(", ");

      response = await callWithOneRetry(
        systemPrompt,
        `${userPrompt}\n\nYour previous response was rejected because these fields were invalid: ${failedPaths}. Return the complete report again, matching the schema exactly.`,
      );

      parsed = reviewResultSchema.safeParse(response.content);

      if (!parsed.success) throw errors.aiInvalidResponse();
    }

    await reviewRepository.markCompleted(review.id, userId, {
      result: parsed.data,
      overallScore: parsed.data.overallScore,
      model: response.model,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      latencyMs: response.latencyMs,
    });

    // Counted only on success — a provider outage must not consume quota.
    await quotaService.recordUsage(userId, response.usage.totalTokens);

    const updated = await reviewRepository.findById(review.id, userId);
    if (!updated) throw errors.internal();

    return { review: updated, quota: await quotaService.getStatus(userId) };
  } catch (error) {
    const code = isAppError(error) ? error.code : "INTERNAL";
    await reviewRepository.markFailed(review.id, userId, code);
    throw error;
  }
}

export function getReview(userId: string, reviewId: string) {
  return reviewRepository.findById(reviewId, userId);
}
