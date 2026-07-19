import "server-only";

import type {
  Language,
  Review,
  ReviewStatus,
  SourceType,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Data access for reviews.
 *
 * This layer answers "how do I read or write this row?" and nothing else.
 * Business rules — quota, token budget, whether a retry is permitted — belong
 * in server/services (CLAUDE.md R2/R3). Keeping them apart is what makes the
 * services unit-testable without a database.
 *
 * Every function takes `userId` and applies it inside the query rather than
 * fetching a row and comparing afterwards. Fetch-then-compare is how IDOR
 * bugs are written; scoping in the WHERE clause makes a missing row and an
 * unowned row indistinguishable, which is exactly what we want the caller to
 * see.
 */

export interface CreateReviewInput {
  userId: string;
  title: string;
  language: Language;
  sourceCode: string;
  sourceType: SourceType;
}

export interface CompleteReviewInput {
  result: unknown;
  overallScore: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

/** Persist a PENDING review before the AI call, so failures stay recoverable. */
export function createPending(input: CreateReviewInput): Promise<Review> {
  return db.review.create({
    data: {
      userId: input.userId,
      title: input.title,
      language: input.language,
      sourceCode: input.sourceCode,
      sourceType: input.sourceType,
      status: "PENDING",
    },
  });
}

/** Fetch a single review, scoped to its owner. Returns null when not found. */
export function findById(id: string, userId: string): Promise<Review | null> {
  return db.review.findFirst({
    where: { id, userId },
  });
}

/** Mark a review COMPLETED and attach the validated result plus token metrics. */
export function markCompleted(
  id: string,
  userId: string,
  input: CompleteReviewInput,
): Promise<number> {
  return db.review
    .updateMany({
      where: { id, userId },
      data: {
        status: "COMPLETED",
        result: input.result as never,
        overallScore: input.overallScore,
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        latencyMs: input.latencyMs,
        errorCode: null,
      },
    })
    .then((r) => r.count);
}

/** Mark a review FAILED with a taxonomy code, so the UI can offer a retry. */
export function markFailed(
  id: string,
  userId: string,
  errorCode: string,
): Promise<number> {
  return db.review
    .updateMany({
      where: { id, userId },
      data: { status: "FAILED", errorCode },
    })
    .then((r) => r.count);
}

/** Delete a review. Returns the number of rows removed (0 when not owned). */
export function remove(id: string, userId: string): Promise<number> {
  return db.review.deleteMany({ where: { id, userId } }).then((r) => r.count);
}

/** Count a user's reviews, optionally filtered by status. */
export function countByUser(
  userId: string,
  status?: ReviewStatus,
): Promise<number> {
  return db.review.count({
    where: { userId, ...(status ? { status } : {}) },
  });
}
