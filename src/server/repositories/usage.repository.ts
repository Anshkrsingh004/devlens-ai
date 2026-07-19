import "server-only";

import type { DailyUsage } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Data access for the daily quota counter.
 *
 * This table is the Redis replacement. Redis is banned by the zero-cost
 * constraint and is genuinely unnecessary: an atomic upsert on a unique
 * (userId, date) key is a correct, durable, free counter, and Postgres
 * handles the concurrency.
 */

/**
 * Normalise a timestamp to a UTC date with no time component.
 *
 * The column is `@db.Date`, and the quota resets daily. Using local time here
 * would move the reset boundary with the server's timezone — a bug that only
 * shows up for users near midnight and is miserable to reproduce.
 */
export function toDateOnly(when: Date = new Date()): Date {
  return new Date(
    Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate()),
  );
}

/** Read today's usage row. Returns null when the user has not used any quota. */
export function findForDate(
  userId: string,
  date: Date = toDateOnly(),
): Promise<DailyUsage | null> {
  return db.dailyUsage.findUnique({
    where: { userId_date: { userId, date } },
  });
}

/**
 * Atomically record one review's consumption.
 *
 * Upsert rather than read-then-write: two concurrent requests would otherwise
 * both read the same count and write the same incremented value, silently
 * losing one. The unique (userId, date) constraint makes this safe.
 */
export function recordUsage(
  userId: string,
  tokensUsed: number,
  date: Date = toDateOnly(),
): Promise<DailyUsage> {
  return db.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, reviewCount: 1, tokensUsed },
    update: {
      reviewCount: { increment: 1 },
      tokensUsed: { increment: tokensUsed },
    },
  });
}
