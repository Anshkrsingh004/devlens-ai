/**
 * Error taxonomy.
 *
 * One vocabulary for failure across every layer. Services throw `AppError`;
 * `withApiHandler` maps it to a status code and the standard envelope, so no
 * route hand-rolls try/catch and the client sees consistent shapes.
 *
 * See API.md §1.2 for the full table.
 */

export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INPUT_TOO_LARGE: "INPUT_TOO_LARGE",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  AI_RATE_LIMITED: "AI_RATE_LIMITED",
  AI_INVALID_RESPONSE: "AI_INVALID_RESPONSE",
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  INPUT_TOO_LARGE: 413,
  QUOTA_EXCEEDED: 429,
  AI_RATE_LIMITED: 429,
  AI_INVALID_RESPONSE: 502,
  AI_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

/**
 * Factories. Using these rather than `new AppError(...)` keeps user-facing
 * wording consistent and makes it obvious at the call site which failure a
 * branch represents.
 *
 * Messages are safe to display: no stack traces, SQL, or provider internals.
 */
export const errors = {
  unauthorized: () =>
    new AppError(ERROR_CODES.UNAUTHORIZED, "You need to sign in to do that."),

  notFound: (what = "That") =>
    new AppError(ERROR_CODES.NOT_FOUND, `${what} could not be found.`),

  validation: (message: string, details?: Record<string, unknown>) =>
    new AppError(ERROR_CODES.VALIDATION_ERROR, message, details),

  inputTooLarge: (limit: number, actual: number) =>
    new AppError(
      ERROR_CODES.INPUT_TOO_LARGE,
      `That code is too long to review. The limit is ${limit.toLocaleString()} characters and you sent ${actual.toLocaleString()}.`,
      { limit, actual },
    ),

  quotaExceeded: (used: number, limit: number, resetAt: string) =>
    new AppError(
      ERROR_CODES.QUOTA_EXCEEDED,
      `You've used all ${limit} reviews for today.`,
      { used, limit, resetAt },
    ),

  aiRateLimited: (retryAfterSeconds?: number) =>
    new AppError(
      ERROR_CODES.AI_RATE_LIMITED,
      "The AI service is busy right now. Please try again in a moment.",
      retryAfterSeconds ? { retryAfterSeconds } : undefined,
    ),

  aiInvalidResponse: () =>
    new AppError(
      ERROR_CODES.AI_INVALID_RESPONSE,
      "The AI returned a malformed review. You can retry this review.",
    ),

  aiUnavailable: () =>
    new AppError(
      ERROR_CODES.AI_UNAVAILABLE,
      "The AI service is unavailable. You can retry this review.",
    ),

  internal: () =>
    new AppError(ERROR_CODES.INTERNAL, "Something went wrong on our end."),
};

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
