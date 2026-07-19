import "server-only";

import { z } from "zod";

import { reviewResultSchema } from "@/features/review/schemas/review-result.schema";
import { getServerEnv } from "@/lib/env";
import { errors } from "@/lib/errors";

/**
 * Groq HTTP client.
 *
 * A thin transport wrapper: it builds the request, handles provider-level
 * failures, and validates the response against the shared schema. It contains
 * no business logic — quota, persistence and retry policy live in the service
 * layer (CLAUDE.md R2).
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Only the gpt-oss models support strict structured outputs, so this is
 * forced by capability rather than preference. Never a Llama model — Groq
 * retires `llama-3.3-70b` and `llama-3.1-8b` on 2026-08-16.
 */
export const PRIMARY_MODEL = "openai/gpt-oss-120b";
export const FALLBACK_MODEL = "openai/gpt-oss-20b";

/** Below Vercel's 300s ceiling, so a hung provider surfaces as a clean 503. */
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * The JSON Schema sent to Groq, derived from the Zod contract.
 *
 * Generated once at module load rather than per request — it is ~500 tokens
 * of static structure and rebuilding it on every call is pure waste.
 */
const jsonSchema = z.toJSONSchema(reviewResultSchema, { io: "output" });

export interface GroqUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GroqReviewResponse {
  /** Raw parsed JSON — validated by the caller against reviewResultSchema. */
  content: unknown;
  usage: GroqUsage;
  model: string;
  latencyMs: number;
}

export interface GroqRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
}

/**
 * Call Groq and return the parsed response body.
 *
 * @throws AppError — AI_RATE_LIMITED, AI_UNAVAILABLE or AI_INVALID_RESPONSE.
 *         Retry policy is the service layer's decision, not this one's.
 */
export async function requestReview({
  systemPrompt,
  userPrompt,
  model = PRIMARY_MODEL,
}: GroqRequest): Promise<GroqReviewResponse> {
  const { GROQ_API_KEY } = getServerEnv();
  const startedAt = Date.now();

  let response: Response;

  try {
    response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        // Low but non-zero: scores stay as reproducible as an LLM allows
        // without making the output brittle.
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "code_review",
            strict: true,
            schema: jsonSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Network failure or timeout. The message is deliberately generic — the
    // underlying error can contain the API key in a header dump.
    throw errors.aiUnavailable();
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after"));
    throw errors.aiRateLimited(
      Number.isFinite(retryAfter) ? retryAfter : undefined,
    );
  }

  if (!response.ok) {
    // Log the provider's explanation server-side. Without this, a schema or
    // model problem is indistinguishable from an outage, and both surface to
    // the user as the same opaque 503. The body never reaches the client and
    // never contains the API key (that lives in a request header).
    const detail = await response.text().catch(() => "<unreadable>");

    console.error("[groq] request failed", {
      status: response.status,
      model,
      detail: detail.slice(0, 500),
    });

    // Groq validates strict-mode output on its side and returns 400
    // `json_validate_failed` when the model breaks the schema. That is the
    // model getting it wrong, not the service being down — and a second
    // sampling pass usually succeeds.
    //
    // Classifying it as AI_UNAVAILABLE meant the repair retry in
    // review.service never ran, because that path only triggers when OUR Zod
    // check fails — which cannot happen if Groq rejected the response first.
    // A recoverable mistake was being reported as an outage.
    if (response.status === 400 && detail.includes("json_validate_failed")) {
      throw errors.aiInvalidResponse();
    }

    throw errors.aiUnavailable();
  }

  const payload = await response.json().catch(() => null);
  const message = payload?.choices?.[0]?.message?.content;

  if (typeof message !== "string") {
    throw errors.aiInvalidResponse();
  }

  let content: unknown;
  try {
    content = JSON.parse(message);
  } catch {
    // Strict mode should make this impossible, but trusting that would mean
    // a crash instead of a retryable FAILED row if it ever regresses.
    throw errors.aiInvalidResponse();
  }

  return {
    content,
    model,
    latencyMs: Date.now() - startedAt,
    usage: {
      promptTokens: payload?.usage?.prompt_tokens ?? 0,
      completionTokens: payload?.usage?.completion_tokens ?? 0,
      totalTokens: payload?.usage?.total_tokens ?? 0,
    },
  };
}
