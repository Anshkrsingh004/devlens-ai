import type { ErrorCode } from "@/lib/errors";

/**
 * Typed client for our own API.
 *
 * Unwraps the `{ data }` envelope and converts `{ error }` into a thrown,
 * typed exception — in one place. Without this every hook would re-implement
 * error detection and the UI would end up with several different failure
 * treatments for the same server response.
 */

export class ApiError extends Error {
  readonly code: ErrorCode | string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** True when retrying the same request could plausibly succeed. */
  get isRetryable(): boolean {
    return (
      this.code === "AI_INVALID_RESPONSE" ||
      this.code === "AI_UNAVAILABLE" ||
      this.code === "AI_RATE_LIMITED"
    );
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, signal }: RequestOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    // Preserve deliberate cancellation so callers can ignore it rather than
    // showing the user an error they caused by navigating away.
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;

    throw new ApiError(
      "NETWORK_ERROR",
      "Could not reach the server. Check your connection.",
      0,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.code ?? "INTERNAL",
      payload?.error?.message ?? "Something went wrong.",
      response.status,
      payload?.error?.details,
    );
  }

  return payload?.data as T;
}
