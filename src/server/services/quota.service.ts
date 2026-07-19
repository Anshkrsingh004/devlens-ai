import "server-only";

import { DAILY_REVIEW_QUOTA } from "@/config/limits";
import { errors } from "@/lib/errors";
import * as usageRepository from "@/server/repositories/usage.repository";

/**
 * Per-user daily quota.
 *
 * Exists to stop one user exhausting the ACCOUNT-WIDE Groq allowance. The
 * free tier gives roughly 30-80 reviews per day across every visitor, so
 * without a per-user cap a single enthusiastic session would leave the app
 * broken for everyone else — including whoever is looking at it during an
 * interview.
 */

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  tokensUsed: number;
  /** ISO timestamp of the next UTC midnight, when the quota resets. */
  resetAt: string;
}

function nextResetAt(): string {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return tomorrow.toISOString();
}

export async function getStatus(userId: string): Promise<QuotaStatus> {
  const usage = await usageRepository.findForDate(userId);
  const used = usage?.reviewCount ?? 0;

  return {
    used,
    limit: DAILY_REVIEW_QUOTA,
    remaining: Math.max(0, DAILY_REVIEW_QUOTA - used),
    tokensUsed: usage?.tokensUsed ?? 0,
    resetAt: nextResetAt(),
  };
}

/**
 * Reject the request when the user has spent their daily allowance.
 *
 * Checked BEFORE the token budget and before any row is written, so a request
 * that cannot succeed does the least possible work.
 *
 * @throws AppError with code QUOTA_EXCEEDED
 */
export async function assertWithinQuota(userId: string): Promise<QuotaStatus> {
  const status = await getStatus(userId);

  if (status.remaining <= 0) {
    throw errors.quotaExceeded(status.used, status.limit, status.resetAt);
  }

  return status;
}

/**
 * Record consumption after a review completes.
 *
 * Deliberately counted on success only. Charging for a provider outage would
 * let a bad afternoon at Groq burn a user's entire daily allowance.
 */
export function recordUsage(userId: string, tokensUsed: number) {
  return usageRepository.recordUsage(userId, tokensUsed);
}
