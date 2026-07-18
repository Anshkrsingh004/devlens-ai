# DevLens AI — API Contract

> Next.js 15 Route Handlers · REST over JSON
> Companion to `IMPLEMENTATION_ROADMAP.md`

---

## 1. Conventions

### 1.1 Response Envelope

**Every** endpoint returns one of exactly two shapes. No exceptions.

**Success**

```jsonc
{ "data": {/* payload */} }
```

**Failure**

```jsonc
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable, safe to display in a toast",
    "details": { "sourceCode": "Must be 8000 characters or fewer" },
  },
}
```

> **Why a uniform envelope?** The client's `api-client.ts` unwraps `data` and throws typed errors from `error` in one place. Without it, every hook re-implements error detection and the UI ends up with three different failure treatments.

### 1.2 Error Taxonomy

Defined once in `lib/errors.ts`. Route handlers throw `AppError`; `withApiHandler` maps to status codes. **No route writes its own try/catch.**

| Code                  | Status | Meaning                               | Client should                  |
| --------------------- | -----: | ------------------------------------- | ------------------------------ |
| `UNAUTHORIZED`        |    401 | No valid session                      | Redirect to sign-in            |
| `FORBIDDEN`           |    403 | Authenticated but not permitted       | Show error                     |
| `NOT_FOUND`           |    404 | Missing **or not owned**              | Show not-found                 |
| `VALIDATION_ERROR`    |    422 | DTO failed Zod parsing                | Show field errors              |
| `INPUT_TOO_LARGE`     |    413 | Exceeds the token budget              | Show size guidance             |
| `QUOTA_EXCEEDED`      |    429 | Daily user quota spent                | Show quota + reset time        |
| `AI_RATE_LIMITED`     |    429 | Groq returned 429 after retry         | Suggest retrying later         |
| `AI_INVALID_RESPONSE` |    502 | Model output failed schema validation | Offer Retry                    |
| `AI_UNAVAILABLE`      |    503 | Groq unreachable or timed out         | Offer Retry                    |
| `INTERNAL`            |    500 | Unexpected                            | Generic error, log server-side |

> **Why `NOT_FOUND` and never `FORBIDDEN` for another user's review.** Returning `403` confirms the ID exists, leaking information. Ownership is enforced inside the query (`where: { id, userId }`), so a missing row and an unowned row are indistinguishable. This is deliberate.

### 1.3 Authentication

Session cookie issued by Better Auth (`httpOnly`, `secure` in production, `sameSite=lax`).

Every protected handler calls `requireSession()`, which throws `UNAUTHORIZED` when absent. **This is the real security boundary** — `middleware.ts` performs only an optimistic cookie check for redirect UX and must never be relied upon for authorization.

### 1.4 Validation

- All request bodies and query params are parsed with Zod before reaching a service.
- Input schemas are **shared with the client**, so both validate against identical rules.
- Parse failures return `422` with field-level `details`.
- Validation answers _"is this well-formed?"_; services answer _"is this allowed?"_.

### 1.5 Route Summary

| Method   | Route                      |   Auth   | Milestone |
| -------- | -------------------------- | :------: | :-------: |
| `ALL`    | `/api/auth/[...all]`       |    —     |    M2     |
| `POST`   | `/api/reviews`             |    ✅    |    M3     |
| `GET`    | `/api/reviews`             |    ✅    |    M5     |
| `GET`    | `/api/reviews/[id]`        | ✅ owner |    M3     |
| `PATCH`  | `/api/reviews/[id]`        | ✅ owner |    M5     |
| `DELETE` | `/api/reviews/[id]`        | ✅ owner |    M5     |
| `POST`   | `/api/reviews/[id]/retry`  | ✅ owner |    M5     |
| `GET`    | `/api/reviews/[id]/export` | ✅ owner |    M6     |
| `GET`    | `/api/usage`               |    ✅    |    M3     |
| `GET`    | `/api/preferences`         |    ✅    |    M7     |
| `PATCH`  | `/api/preferences`         |    ✅    |    M7     |
| `GET`    | `/api/health`              |    —     |    M1     |

---

## 2. Authentication

### `ALL /api/auth/[...all]`

Delegated entirely to Better Auth via `toNextJsHandler`. We do not implement these endpoints.

| Sub-route                       | Purpose             |
| ------------------------------- | ------------------- |
| `POST /api/auth/sign-up/email`  | Email registration  |
| `POST /api/auth/sign-in/email`  | Email login         |
| `GET /api/auth/sign-in/google`  | Google OAuth start  |
| `GET /api/auth/callback/google` | OAuth callback      |
| `POST /api/auth/sign-out`       | Session termination |
| `GET /api/auth/get-session`     | Current session     |

**Client validation rules** (enforced in `features/auth/schemas/`, matching Better Auth's server rules):

| Field      | Rules                                           |
| ---------- | ----------------------------------------------- |
| `email`    | Valid email, ≤255 chars, normalized lowercase   |
| `password` | 8–128 chars, at least one letter and one number |
| `name`     | 2–60 chars, trimmed                             |

**Side effect on first sign-up:** a `UserPreference` row is created with defaults.

**Errors:** `422` invalid input · `409` email already registered (message must not confirm existence beyond what the sign-up flow already reveals) · `401` bad credentials.

---

## 3. Reviews

### `POST /api/reviews` — Create and run a review

The most important endpoint in the application. Synchronous: the AI call completes within the request.

**Auth:** required.
**Duration:** 20–90s typical. `maxDuration` set to 300s (Vercel Hobby ceiling).

**Request**

```jsonc
{
  "language": "PYTHON",
  "sourceCode": "def foo(n):\n    ...",
  "sourceType": "PASTE",
  "title": "Binary search implementation",
}
```

**Validation**

| Field        | Rules                                                            | Failure   |
| ------------ | ---------------------------------------------------------------- | --------- |
| `language`   | Required. One of `CPP`,`PYTHON`,`JAVA`,`JAVASCRIPT`,`TYPESCRIPT` | 422       |
| `sourceCode` | Required. 10–**8000** chars, non-whitespace                      | 422 / 413 |
| `sourceType` | Optional, default `PASTE`. `PASTE` \| `UPLOAD`                   | 422       |
| `title`      | Optional, ≤120 chars. AI-generated when omitted                  | 422       |

> **Why the 8,000-character cap.** It maps to ~2,000 tokens, which is the input allocation within a ~7,100-token budget against Groq's 8,000 TPM limit. The constant lives in `config/limits.ts` and is enforced by a schema shared with the client, so oversized input is rejected before the network call.

**Processing order** — deliberately cheapest-check-first, so expensive work never runs for a request that will fail:

```
1. requireSession()                 → 401
2. Zod.parse(body)                  → 422
3. quotaService.assert(userId)      → 429 QUOTA_EXCEEDED
4. tokenBudget.assert(sourceCode)   → 413 INPUT_TOO_LARGE
5. INSERT Review(status = PENDING)  ← persisted BEFORE the AI call
6. Groq call (strict structured output)
7. ReviewResultSchema.parse(output) → 502 on failure
8. UPDATE Review(COMPLETED, ...) + increment DailyUsage
```

**Success — `201`**

```jsonc
{
  "data": {
    "id": "clx7f3k2p0001",
    "status": "COMPLETED",
    "title": "Binary search implementation",
    "language": "PYTHON",
    "overallScore": 72,
    "createdAt": "2026-07-19T10:30:00.000Z",
    "result": {/* ReviewResult — see §7 */},
  },
}
```

**Errors**

| Status | Code                  | When                                         |
| ------ | --------------------- | -------------------------------------------- |
| 401    | `UNAUTHORIZED`        | No session                                   |
| 413    | `INPUT_TOO_LARGE`     | Over the character cap                       |
| 422    | `VALIDATION_ERROR`    | Bad language or empty source                 |
| 429    | `QUOTA_EXCEEDED`      | Daily user limit reached. Includes `resetAt` |
| 429    | `AI_RATE_LIMITED`     | Groq 429 persisted after one retry           |
| 502    | `AI_INVALID_RESPONSE` | Output failed schema validation twice        |
| 503    | `AI_UNAVAILABLE`      | Groq unreachable or timed out                |

**Quota error detail**

```jsonc
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "You've used all 10 reviews for today.",
    "details": {
      "used": 10,
      "limit": 10,
      "resetAt": "2026-07-20T00:00:00.000Z",
    },
  },
}
```

**Retry semantics**

- Groq `429` → honour the `retry-after` header, retry **once**, then fail.
- Schema validation failure → **one** repair attempt with a corrective instruction, then fail.
- Failures persist the row as `FAILED` with `errorCode`. **A failed review never silently disappears.**

> **Why not streaming?** Groq's strict structured outputs are incompatible with streaming. Since the entire product depends on a rigidly-shaped 13-section report, schema guarantees win over perceived speed. The UI compensates with staged skeletons — never a fabricated progress bar.

---

### `GET /api/reviews` — List reviews

**Auth:** required. Returns only the caller's reviews.

**Query parameters**

| Param      | Type    | Default | Rules                                        |
| ---------- | ------- | ------- | -------------------------------------------- |
| `q`        | string  | —       | ≤100 chars. Case-insensitive title search    |
| `language` | enum    | —       | Filter by language                           |
| `favorite` | boolean | —       | `true` restricts to favorites                |
| `status`   | enum    | —       | `PENDING`\|`COMPLETED`\|`FAILED`             |
| `cursor`   | string  | —       | `id` of the last item from the previous page |
| `limit`    | int     | `20`    | 1–50                                         |

**Success — `200`**

```jsonc
{
  "data": {
    "items": [
      {
        "id": "clx7f3k2p0001",
        "title": "Binary search implementation",
        "language": "PYTHON",
        "status": "COMPLETED",
        "overallScore": 72,
        "isFavorite": false,
        "createdAt": "2026-07-19T10:30:00.000Z",
      },
    ],
    "nextCursor": "clx7f3k2p0001",
    "hasMore": true,
  },
}
```

> **`result` and `sourceCode` are deliberately excluded from list items.** Including them would make a 20-item page roughly 280 KB of payload the dashboard never renders. Full documents are fetched on demand by ID.

> **Cursor, not offset.** `OFFSET` skips or duplicates rows when items are inserted between page loads, and degrades linearly. Cursor pagination is stable and index-backed.

**Errors:** `401` · `422` (invalid `limit`/`cursor`).

---

### `GET /api/reviews/[id]` — Single review

**Auth:** required, owner only.

**Success — `200`** — the full record including `result` and `sourceCode`.

**Errors:** `401` · **`404`** when missing _or not owned_ (never `403` — see §1.2).

---

### `PATCH /api/reviews/[id]` — Rename / favorite

**Auth:** required, owner only.

**Request** — at least one field required.

```jsonc
{ "title": "Renamed review", "isFavorite": true }
```

| Field        | Rules                          |
| ------------ | ------------------------------ |
| `title`      | Optional. 1–120 chars, trimmed |
| `isFavorite` | Optional. Boolean              |

**Success — `200`** — the updated review summary.

**Errors:** `401` · `404` · `422` (empty body or invalid title).

> **Client behaviour:** favorite toggling is optimistic. The UI updates immediately and **visibly rolls back** on failure. The rollback path is explicitly tested — optimistic updates that only work on the happy path are a latent bug.

---

### `DELETE /api/reviews/[id]`

**Auth:** required, owner only.

**Success — `200`** → `{ "data": { "id": "clx7f3k2p0001", "deleted": true } }`

**Errors:** `401` · `404`.

**Notes**

- Hard delete. `sourceCode` may contain code the user wants genuinely removed, so soft-delete is deliberately not used.
- Idempotent from the client's perspective: deleting an already-deleted review returns `404`, which the UI treats as success.
- Requires confirmation in the UI, with an undo toast covering the optimistic window.

---

### `POST /api/reviews/[id]/retry`

Re-runs a `FAILED` review, reusing the stored `sourceCode`.

**Auth:** required, owner only.
**Request body:** none.

**Success — `201`** — same shape as `POST /api/reviews`.

**Errors**

| Status | Code               | When                            |
| ------ | ------------------ | ------------------------------- |
| 401    | `UNAUTHORIZED`     | No session                      |
| 404    | `NOT_FOUND`        | Missing or not owned            |
| 422    | `VALIDATION_ERROR` | Review is not in `FAILED` state |
| 429    | `QUOTA_EXCEEDED`   | **A retry consumes quota**      |

> **Why a retry costs quota.** It is a real Groq call against the same daily budget. Making retries free would let a failure loop exhaust the account-wide limit. The UI states this plainly.
>
> Retry **updates the existing row** rather than creating a new one — history stays clean and the token metrics reflect total spend.

---

### `GET /api/reviews/[id]/export`

**Auth:** required, owner only.

| Param    | Values | Default |
| -------- | ------ | ------- |
| `format` | `md`   | `md`    |

**Success — `200`**

```
Content-Type: text/markdown; charset=utf-8
Content-Disposition: attachment; filename="devlens-review-clx7f3k2p0001.md"
```

Body is raw Markdown, **not** the JSON envelope — it is a file download.

**Errors:** `401` · `404` · `422` (unsupported format).

> **Why PDF is absent from this endpoint.** PDF is generated **client-side** with `@react-pdf/renderer`, lazy-loaded on demand. Server-side PDF would require headless Chromium, which exceeds Vercel's 250 MB bundle limit and is far too slow for the Hobby tier. Client-side rendering keeps the server bundle clean and scales at zero marginal cost.
>
> `FAILED` reviews export successfully, containing metadata and the error reason rather than a report.

---

## 4. Usage

### `GET /api/usage`

Powers the quota meter. Cheap and called frequently.

**Auth:** required.

**Success — `200`**

```jsonc
{
  "data": {
    "used": 3,
    "limit": 10,
    "remaining": 7,
    "tokensUsed": 18420,
    "resetAt": "2026-07-20T00:00:00.000Z",
  },
}
```

**Errors:** `401`.

> **Why expose this at all?** The free-tier ceiling is a real product constraint. Hiding it produces a confusing `429` at an unpredictable moment; surfacing it lets the user plan. Honest constraint communication is a UX decision, not just an engineering one.

---

## 5. Preferences

### `GET /api/preferences`

**Auth:** required. Creates defaults on first access if the row is somehow missing (defensive — sign-up normally creates it).

**Success — `200`**

```jsonc
{
  "data": {
    "theme": "SYSTEM",
    "defaultLanguage": "TYPESCRIPT",
    "reviewDepth": "BALANCED",
    "includeRefactor": true,
  },
}
```

### `PATCH /api/preferences`

**Request** — partial update, at least one field.

| Field             | Rules                                 |
| ----------------- | ------------------------------------- |
| `theme`           | `LIGHT` \| `DARK` \| `SYSTEM`         |
| `defaultLanguage` | Any `Language` value                  |
| `reviewDepth`     | `CONCISE` \| `BALANCED` \| `THOROUGH` |
| `includeRefactor` | Boolean                               |

**Success — `200`** — the full updated preferences.
**Errors:** `401` · `422`.

> **These preferences must genuinely change behaviour, not merely persist.** `reviewDepth` alters prompt verbosity and `includeRefactor` removes the refactor section from the requested schema — reclaiming roughly 1,500 output tokens. On an 8,000 TPM budget that is the difference between a large file succeeding and hitting a rate limit. A settings page whose toggles do nothing is a common and immediately visible flaw.

---

## 6. Health

### `GET /api/health`

**Auth:** none — intentionally public.

**Success — `200`** → `{ "data": { "status": "ok", "db": "connected", "timestamp": "..." } }`
**Failure — `503`** → `{ "error": { "code": "INTERNAL", "message": "Database unreachable" } }`

**Two jobs:**

1. Deployment verification for each milestone's acceptance criteria.
2. **Supabase keepalive.** A daily GitHub Actions cron calls it, and because it performs a real query it counts as database activity — preventing the 7-day inactivity pause that would otherwise take the portfolio link offline.

It must execute an actual lightweight query (`SELECT 1`), not merely return a static string, or it will not register as activity.

---

## 7. The `ReviewResult` Contract

Produced by Groq under strict structured output, validated by `ReviewResultSchema`, and consumed by the UI, export, and tests. **This is the most important contract in the application.**

```jsonc
{
  "overallScore": 72,
  "summary": "A functional binary search with an off-by-one boundary error…",
  "bugs": [
    {
      "severity": "HIGH",
      "title": "Off-by-one in the loop condition",
      "description": "Using `<` instead of `<=` skips the final element…",
      "line": 12,
      "suggestion": "Change `while (low < high)` to `while (low <= high)`",
    },
  ],
  "securityIssues": [],
  "performanceIssues": [],
  "codeSmells": [],
  "maintainability": [
    {
      "title": "Extract the comparison",
      "description": "…",
      "impact": "MEDIUM",
    },
  ],
  "bestPractices": [{ "title": "Add type hints", "description": "…" }],
  "timeComplexity": {
    "value": "O(log n)",
    "explanation": "Halves the range each iteration",
  },
  "spaceComplexity": {
    "value": "O(1)",
    "explanation": "Only scalar variables",
  },
  "refactoredCode": "def binary_search(arr, target):\n    ...",
  "commitMessage": "fix: correct off-by-one in binary search boundary",
  "prDescription": "## Summary\n…",
}
```

### Strict-mode design rules

Groq's strict structured output requires every property to be `required` with `additionalProperties: false`. Therefore:

1. **No optional fields anywhere.** Empty arrays represent "nothing found".
2. **No union types.** `line` is always a number; `0` means "not line-specific".
3. **No nested optionals.** Every object has a fixed shape.
4. **`"N/A"` is a legal value** for `timeComplexity.value` and `spaceComplexity.value`.

> **Why rule 4 matters.** Time and space complexity are meaningless for a React component or a configuration file. Without an explicit escape hatch, the model _will_ invent a plausible-looking `O(n)`. Permitting `"N/A"` with an explanation converts a hallucination into an honest answer — and the UI renders it as such rather than displaying fabricated analysis.

### Field constraints

| Field                                                          | Type           | Constraint                                        |
| -------------------------------------------------------------- | -------------- | ------------------------------------------------- |
| `overallScore`                                                 | int            | 0–100                                             |
| `summary`                                                      | string         | 50–1000 chars                                     |
| `bugs` / `securityIssues` / `performanceIssues` / `codeSmells` | `Finding[]`    | 0–10 items each                                   |
| `Finding.severity`                                             | enum           | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL`         |
| `Finding.line`                                                 | int            | ≥0; `0` = not line-specific                       |
| `maintainability` / `bestPractices`                            | `Suggestion[]` | 0–10 items                                        |
| `timeComplexity` / `spaceComplexity`                           | object         | `value` ≤32 chars                                 |
| `refactoredCode`                                               | string         | ≤6000 chars; `""` when `includeRefactor` is false |
| `commitMessage`                                                | string         | ≤100 chars, Conventional Commits format           |
| `prDescription`                                                | string         | ≤2000 chars, Markdown                             |

> **The four `Finding[]` arrays share one shape.** This is why a single `FindingList` component renders bugs, security issues, performance problems, and code smells — one component, four usages, instead of four near-identical ones.

---

## 8. Cross-Cutting Rules

### Rate limiting

Two independent layers:

| Layer          | Enforced by        | Limit                                        |
| -------------- | ------------------ | -------------------------------------------- |
| Per-user daily | `DailyUsage` table | 10 reviews/day (configurable)                |
| Provider       | Groq               | 30 RPM · 1,000 RPD · 8,000 TPM · 200,000 TPD |

The per-user quota exists to stop one user exhausting the **account-wide** provider budget. With ~30 reviews/day available in total, a 10/day per-user cap keeps the app usable for multiple simultaneous visitors — which matters precisely when a recruiter is looking at it.

### Idempotency

`POST /api/reviews` is **not** idempotent — each call consumes quota. The client must disable the submit button while in flight. This is deliberate: an idempotency-key mechanism would add real complexity for a single-user portfolio tool.

### Caching

| Endpoint                | Cache                                                           |
| ----------------------- | --------------------------------------------------------------- |
| `GET /api/reviews`      | `no-store` — must reflect mutations immediately                 |
| `GET /api/reviews/[id]` | `no-store`; TanStack Query caches client-side                   |
| `GET /api/usage`        | `no-store` — quota must always be accurate                      |
| `GET /api/health`       | `no-store` — otherwise the keepalive never reaches the database |

All authenticated responses set `Cache-Control: private, no-store` to prevent any CDN from caching user data.

### Logging

Log server-side: `userId`, route, status, duration, `errorCode`, token counts.
**Never log:** `sourceCode`, session tokens, `GROQ_API_KEY`, password hashes, or full Groq responses.

Source code is user-submitted intellectual property. It belongs in the database the user controls and can delete — not in log aggregation nobody can purge.

### Timeouts

| Operation                           | Timeout |
| ----------------------------------- | ------- |
| Groq request                        | 120s    |
| `POST /api/reviews` (`maxDuration`) | 300s    |
| Database query                      | 10s     |

The Groq timeout sits well below Vercel's ceiling so a hung provider call surfaces as a clean `503 AI_UNAVAILABLE` with a persisted `FAILED` row — rather than an opaque `FUNCTION_INVOCATION_TIMEOUT` that loses the record entirely.
