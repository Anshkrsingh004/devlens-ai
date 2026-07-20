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

/** Fields returned in list views. `result` and `sourceCode` are excluded
 *  deliberately — including them would make a 20-item page roughly 280 KB of
 *  payload the dashboard never renders. */
const LIST_FIELDS = {
  id: true,
  title: true,
  language: true,
  status: true,
  overallScore: true,
  isFavorite: true,
  createdAt: true,
} as const;

export type ReviewListItem = Pick<
  Review,
  | "id"
  | "title"
  | "language"
  | "status"
  | "overallScore"
  | "isFavorite"
  | "createdAt"
>;

export interface ListReviewsOptions {
  search?: string;
  language?: Language;
  status?: ReviewStatus;
  favoritesOnly?: boolean;
  /** `id` of the last item on the previous page. */
  cursor?: string;
  limit: number;
}

/**
 * Cursor-paginated list, newest first.
 *
 * Cursor rather than offset: OFFSET shifts when rows are inserted between
 * page fetches, so a user scrolling while a review completes would see
 * duplicates or skipped items. It also degrades linearly as the offset grows.
 */
export async function listByUser(
  userId: string,
  options: ListReviewsOptions,
): Promise<{ items: ReviewListItem[]; nextCursor: string | null }> {
  const items = await db.review.findMany({
    where: {
      userId,
      ...(options.search
        ? { title: { contains: options.search, mode: "insensitive" } }
        : {}),
      ...(options.language ? { language: options.language } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.favoritesOnly ? { isFavorite: true } : {}),
    },
    select: LIST_FIELDS,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    // Fetch one extra to determine whether another page exists, without a
    // second count query.
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > options.limit;
  const page = hasMore ? items.slice(0, options.limit) : items;

  return {
    items: page,
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

/** Toggle favorite / rename. Returns the updated row, or null if not owned. */
export async function updateOwned(
  id: string,
  userId: string,
  data: { title?: string; isFavorite?: boolean },
): Promise<ReviewListItem | null> {
  const { count } = await db.review.updateMany({ where: { id, userId }, data });

  if (count === 0) return null;

  return db.review.findFirst({ where: { id, userId }, select: LIST_FIELDS });
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
