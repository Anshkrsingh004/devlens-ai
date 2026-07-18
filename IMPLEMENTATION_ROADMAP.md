# DevLens AI — Implementation Roadmap

> **AI-Powered Code Review & Pull Request Assistant**
> Engineering plan · v1.0 · Authored 2026-07-18

---

## 0. How To Read This Document

This roadmap is the single source of truth for _what gets built, in what order, and why_. It is written to be executed milestone-by-milestone without ever needing to redesign the architecture.

**Companion documents**

| File                   | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| `PROJECT_STRUCTURE.md` | Every folder and file, with purpose and rationale        |
| `DATABASE.md`          | Tables, columns, relations, indexes, scaling             |
| `API.md`               | Every route: request, response, auth, validation, errors |
| `TASKS.md`             | The executable checklist (~130 tasks, each <2h)          |
| `CLAUDE.md`            | Permanent repo memory — coding standards and rules       |

**Golden rules governing this plan**

1. Every milestone ends with a **fully working, deployed application**.
2. No milestone depends on a feature that does not yet exist.
3. Never mix UI and business logic.
4. Never duplicate business logic.
5. Never introduce a paid service. Total cost: **₹0**.

---

## 1. Verified Constraints

These were researched against live documentation, not assumed. They are the reason the architecture looks the way it does.

| Constraint                             | Verified value                                                                          | Consequence for the design                               |
| -------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Groq free tier (`openai/gpt-oss-120b`) | 30 RPM · 1,000 RPD · **8,000 TPM** · 200,000 TPD                                        | Hard input cap. One review ≈ one minute of budget        |
| Strict structured outputs              | Supported on **only** `gpt-oss-120b` / `gpt-oss-20b`                                    | Model choice is forced by capability, not preference     |
| Structured outputs + streaming         | **Mutually exclusive**                                                                  | No token streaming anywhere. Skeleton loaders instead    |
| Groq Llama models                      | `llama-3.3-70b`, `llama-3.1-8b` deprecated **2026-08-16**                               | Do not build on them despite most tutorials doing so     |
| Vercel Hobby duration                  | 300s default and maximum                                                                | 20–90s review fits one request — **no job queue needed** |
| Vercel body size                       | 4.5 MB request/response                                                                 | Our 8 KB source cap is far below this                    |
| Supabase free tier                     | 500 MB · 2 projects · **pauses after 7 days idle**                                      | #1 portfolio risk. Requires a keepalive cron             |
| Prisma + Supabase                      | Needs `DATABASE_URL` (pooler `:6543`, `?pgbouncer=true`) **and** `DIRECT_URL` (`:5432`) | Two env vars or migrations break in production           |
| Local machine                          | Node 20.19.5 · npm 10.8.2 · git · **no Docker, no psql**                                | Supabase serves as both dev and prod database            |

> **Note on Next.js 15.** Current stable is 16.2.10 LTS. Version 15 is mandated by the brief and is fully supported here. Upgrading later is a one-time migration, not an architectural change — see §11.

---

## 2. Architecture

### 2.1 Layering

Four layers. One rule: **dependencies point inward, and the UI never touches Prisma or Groq directly.**

```
┌──────────────────────────────────────────────────────────────┐
│  PRESENTATION           app/ + features/*/components         │
│  React Server Components by default                          │
│  "use client" only for interactivity                         │
│  MUST NOT import: prisma, groq, server/*                     │
└────────────────┬─────────────────────────────────────────────┘
                 │  TanStack Query hooks → fetch()
┌────────────────▼─────────────────────────────────────────────┐
│  TRANSPORT              app/api/**/route.ts                  │
│  Auth guard · Zod DTO parse · error envelope                 │
│  Contains NO business logic                                  │
└────────────────┬─────────────────────────────────────────────┘
                 │  typed service calls
┌────────────────▼─────────────────────────────────────────────┐
│  DOMAIN / SERVICE       server/services/*                    │
│  ALL business logic: quota, token budget, prompts, retries   │
│  Framework-agnostic — never sees Request or Response         │
└────────────────┬─────────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────────┐
│  DATA / INFRA    server/repositories/* · server/ai · lib/db   │
│  Prisma queries + Groq HTTP. Individually swappable.         │
└──────────────────────────────────────────────────────────────┘
```

**Why a service layer on a solo project?** The same logic is reachable from three callers: a route handler, a seed script, and a Vitest test. Without the layer, quota rules and token budgeting get copy-pasted into all three — precisely the technical debt this plan exists to prevent.

**Why Route Handlers and not Server Actions?** TanStack Query is built around fetching URLs. Supporting Server Actions _and_ route handlers would create two mutation paths and two error-handling styles for identical operations — duplicated business logic by construction. **Decision: route handlers exclusively.** Server Actions aren't wrong here; they're redundant.

### 2.2 Data Flow — Creating a Review

```
CLIENT
  Zod validate against shared schema (≤ 8,000 chars)
  Reject locally before any network call
    │
    │ POST /api/reviews  { language, sourceCode, sourceType }
    ▼
ROUTE HANDLER  (transport only)
  requireSession()            → 401 UNAUTHORIZED
  Zod.parse(body)             → 422 VALIDATION_ERROR (field-level details)
    │
    ▼
REVIEW SERVICE  (all logic lives here)
  quotaService.assertWithinDailyLimit(userId)   → 429 QUOTA_EXCEEDED
  tokenBudget.assertFits(sourceCode)            → 413 INPUT_TOO_LARGE
    │
  ┌─┴─ persist Review(status = PENDING)   ← row exists BEFORE the AI call
  │
  ▼
GROQ  openai/gpt-oss-120b · temperature 0.2
      response_format: { type: "json_schema", json_schema: { strict: true } }
    │
    ├── 429 ──→ read `retry-after` ──→ ONE bounded retry ──→ else FAILED
    ├── invalid JSON ──→ ONE schema-repair retry ──────────→ else FAILED
    ▼
  ReviewResultSchema.parse(response)      ← trust nothing from the model
    │
  update Review(COMPLETED, result, overallScore, tokens, latencyMs)
  quotaService.record(userId, tokensUsed)
    │
    ▼
  201 { data: { id, status, result } }
```

**Why persist before calling Groq?** If the connection drops or the tab closes mid-review, the row survives as `PENDING`/`FAILED`, appears in history, and offers a Retry button. Cost: one extra `INSERT`. Benefit: no silently lost work, no double-spent quota. This buys roughly 90% of a job queue's resilience for about 5% of its complexity — and queues are banned by the ₹0 constraint anyway.

**Why synchronous instead of polling?** Vercel Hobby permits 300s; a review takes 20–90s. Polling would add a status endpoint, a client interval, and cache-invalidation edge cases to purchase resilience that persist-first already delivers. Polling is the documented upgrade path if reviews ever approach ~120s.

### 2.3 Token Budget — the constraint everything obeys

Against a hard **8,000 TPM** ceiling, a single review is budgeted at ~7,100 tokens:

| Segment                        |      Budget | Notes                                  |
| ------------------------------ | ----------: | -------------------------------------- |
| System prompt + scoring rubric |        ~600 | Static, versioned constant             |
| JSON schema in the request     |        ~500 | Derived from Zod                       |
| User source code               | **≤ 2,000** | Enforced at 8,000 characters           |
| Reserved for output            |      ~4,000 | 13 sections including refactor patches |
| **Total**                      |  **~7,100** | ~900 tokens of headroom                |

Enforcement lives in **exactly one place**: `MAX_SOURCE_CHARS = 8000` inside a shared Zod schema imported by both client and server. The estimator uses a deliberate `chars / 4` heuristic rather than a tokenizer dependency — we need a conservative guard, not accuracy, and "no unnecessary libraries" is a project rule.

**Single source of truth for the AI contract.** Zod 4 ships a native `z.toJSONSchema()`. The review contract is authored once in Zod and _derived_ into the Groq `json_schema` payload. No hand-maintained duplicate, no drift, no extra dependency.

**Strict-mode design requirement.** Strict structured outputs require every property to be `required` with `additionalProperties: false`. The schema therefore contains **no optional fields** — empty arrays and the literal string `"N/A"` represent "nothing found". This is the single detail that most often breaks strict mode; designing for it up front avoids a painful mid-project refactor.

### 2.4 Authentication Flow

```
Sign-up / Sign-in  →  Better Auth v1.6  →  Prisma adapter  →  Supabase
       │                    │
       │                    ├── email + password (hashed by Better Auth)
       │                    └── Google OAuth 2.0
       ▼
  Session cookie (httpOnly, secure, sameSite=lax)
       │
       ├─ middleware.ts ......... cookie presence → redirect. OPTIMISTIC ONLY
       ├─ Server Components ..... auth.api.getSession() before rendering
       └─ Route Handlers ........ requireSession()  ← THE SECURITY BOUNDARY
```

The `user`, `session`, `account`, and `verification` tables are **generated by the Better Auth CLI** and never hand-written.

> **Stated explicitly so it is never "optimized away":** middleware is not a security boundary. It runs on an optimistic cookie check for redirect UX. Every route handler independently verifies the session and scopes queries by `userId`.

### 2.5 Deployment Flow

```
git push → GitHub
   │
   ├── Pull request  → GitHub Actions CI (typecheck · lint · unit · build)
   │                 → Vercel Preview Deployment (unique URL per PR)
   │
   └── merge to main → Vercel Production
                          postinstall: prisma generate
                          build:       prisma migrate deploy && next build
                          │
                          └── Supabase Postgres (pooled :6543 at runtime)

GitHub Actions cron (daily) → GET /api/health → keeps Supabase awake
```

---

## 3. Milestone Overview

Ordering principle: **de-risk the unknown early, deploy from day one, never build on something that does not exist.**

| #   | Milestone                      | Ships                         | Risk        |
| --- | ------------------------------ | ----------------------------- | ----------- |
| M0  | Foundation & Live Deployment   | Public URL, CI green          | Low         |
| M1  | Data Layer                     | DB connected, schema migrated | **High**    |
| M2  | Authentication                 | Real users can sign in        | **High**    |
| M3  | AI Review Engine _(headless)_  | **The product exists**        | **Highest** |
| M4  | Review Workspace UI            | The product experience        | Medium      |
| M5  | Dashboard, History, Search     | Full data lifecycle           | Medium      |
| M6  | Export (Markdown + PDF)        | Shareable artifacts           | Low         |
| M7  | Settings & Portfolio Hardening | Interview-ready               | Low         |

**Two deliberate departures from the ordering suggested in the brief**, both defensible in review:

1. **Deployment is M0, not last.** Deploying at the end converts a hundred small configuration problems into one compounding crisis in the final week. Every milestone from M0 onward ships to a live URL.
2. **Database precedes Authentication.** Better Auth _persists_ users and sessions to Postgres through Prisma. Auth-before-database is not buildable.

---

## 4. Milestones In Detail

---

### M0 — Foundation & Live Deployment Pipeline

**Objective**
Get a deployed Next.js 15 application onto a public URL with CI passing, _before any feature exists_.

**Features**

- Next.js 15 + TypeScript (strict) + TailwindCSS + shadcn/ui
- Zod-validated environment loader that fails at boot with a readable message
- Root layout, theme provider (light/dark), marketing landing page
- ESLint + Prettier + `npm` scripts
- Vitest + Playwright harnesses (no meaningful tests yet, just wiring)
- GitHub repository + Actions CI + Vercel project connected

**Folder Changes**
`src/app/(marketing)` · `src/components/ui` · `src/components/shared` · `src/lib` · `src/config` · `tests/` · `.github/workflows/ci.yml`

**Database Changes** — none.

**API Routes** — none.

**Frontend Components**
`RootLayout`, `ThemeProvider`, `LandingPage`, `SiteHeader`, `SiteFooter`

**Backend Components**
`lib/env.ts` — Zod-validated environment access. Nothing else reads `process.env` directly, ever.

**Reusable Components**

| Component     | Why it exists                           | Depended on by            | Reusable |
| ------------- | --------------------------------------- | ------------------------- | -------- |
| `AppShell`    | Single page frame: header, main, footer | Every page from M2 onward | Yes      |
| `ThemeToggle` | Theme switching in one place            | Header, settings page     | Yes      |
| `Container`   | Consistent max-width and gutters        | Every page                | Yes      |

**Acceptance Criteria**

- [ ] A public Vercel URL renders the landing page
- [ ] `npm run build`, `lint`, and `typecheck` all pass cleanly
- [ ] CI runs and passes on a pull request
- [ ] Removing a required env var fails the build with a readable error
- [ ] Dark/light theme toggles and persists across reloads

**Testing Checklist**

- [ ] Production build succeeds
- [ ] Playwright smoke test loads `/` and asserts the headline
- [ ] CI triggers on PR and blocks on failure
- [ ] Landing page is legible at 375px and 1440px

**Potential Risks**

- _(Medium)_ Tailwind v4 + shadcn/ui init friction on Next 15 → pin versions, follow shadcn's Next 15 guide verbatim, do not improvise.
- _(Low)_ Vercel project misconfiguration → connect and deploy on day one so failures are cheap.

**Definition of Done**
A shareable live URL exists. Merging to `main` auto-deploys. CI gates every PR.

---

### M1 — Data Layer

**Objective**
Supabase connected, schema migrated, repositories tested and proven **in production**. Zero visible UI change.

**Features**

- Supabase project provisioned (free tier)
- Prisma 7 with the mandatory two-connection-string setup
- Prisma client singleton (globally cached in dev to survive HMR)
- `Review`, `DailyUsage`, `UserPreference` models and all enums
- Repository layer wrapping every query
- Seed script with deterministic sample data
- `GET /api/health` performing a real DB round-trip

**Folder Changes**
`prisma/` (schema, migrations, seed) · `src/server/repositories/` · `src/lib/db.ts` · `src/app/api/health/`

**Database Changes**
First migration creates `Review`, `DailyUsage`, `UserPreference` plus enums `Language`, `SourceType`, `ReviewStatus`, `Theme`, `ReviewDepth`. Full detail in `DATABASE.md`.

**API Routes**
`GET /api/health` → `{ status: "ok", db: "connected" }`

**Frontend Components** — none.

**Backend Components**
`lib/db.ts` (Prisma singleton) · `server/repositories/review.repository.ts` · `usage.repository.ts` · `preference.repository.ts`

**Reusable Components**

| Component        | Why it exists                                       | Depended on by     | Reusable           |
| ---------------- | --------------------------------------------------- | ------------------ | ------------------ |
| `db` singleton   | Prevents connection exhaustion on serverless        | Every repository   | Yes — foundational |
| Repository layer | Isolates Prisma so services never write raw queries | All services (M3+) | Yes                |

**Acceptance Criteria**

- [ ] `prisma migrate dev` applies cleanly to an empty database
- [ ] `/api/health` returns `ok` **on the deployed Vercel URL**, not just locally
- [ ] Seed script runs idempotently
- [ ] Repository unit tests pass against a real test database

**Testing Checklist**

- [ ] Migration applies cleanly from scratch
- [ ] CRUD round-trip for each repository
- [ ] Health check green in production
- [ ] Connection survives ~20 rapid sequential requests (pooling sanity)

**Potential Risks**

- _**(High)**_ Wrong pooled/direct URL split — symptoms are hanging migrations or `prepared statement "s0" already exists` in production. **Mitigation: verify both URLs locally _and_ on Vercel during this milestone.** This bug is far more expensive to diagnose in M5.
- _(Medium)_ Supabase free-tier connection ceiling → always use the pooled URL at runtime; `DIRECT_URL` is for the CLI only.
- _(Low)_ 500 MB storage cap → `sourceCode` is capped at 8 KB, so ~50,000 reviews fit comfortably.

**Definition of Done**
The production app talks to the production database. The schema is version-controlled and reproducible.

---

### M2 — Authentication

**Objective**
Real users can register, sign in with email or Google, and reach a protected (still empty) dashboard.

**Features**

- Better Auth v1.6 + Prisma adapter
- Email/password and Google OAuth
- Auth tables generated via the Better Auth CLI
- Sign-in / sign-up forms with React Hook Form + Zod
- Middleware redirect for unauthenticated users
- `requireSession()` server guard
- User menu with sign-out
- `UserPreference` row auto-created on first sign-up

**Folder Changes**
`src/app/(auth)/{sign-in,sign-up}` · `src/app/(dashboard)` · `src/features/auth/{components,hooks,schemas}` · `src/server/auth/` · `src/app/api/auth/[...all]` · `src/middleware.ts`

**Database Changes**
Better Auth CLI generates `user`, `session`, `account`, `verification`. `Review`, `DailyUsage`, and `UserPreference` gain their `userId` foreign keys with `onDelete: Cascade`.

**API Routes**
`ALL /api/auth/[...all]` — delegated entirely to Better Auth.

**Frontend Components**
`SignInForm`, `SignUpForm`, `GoogleButton`, `UserMenu`, `AuthCard`, `(dashboard)/layout.tsx`

**Backend Components**
`server/auth/auth.ts` (Better Auth config) · `server/auth/guards.ts` (`requireSession`, `getOptionalSession`)

**Reusable Components**

| Component                | Why it exists                        | Depended on by                    | Reusable       |
| ------------------------ | ------------------------------------ | --------------------------------- | -------------- |
| `requireSession()`       | The single security boundary         | **Every** protected route handler | Yes — critical |
| `AuthCard`               | Shared shell for both auth forms     | Sign-in, sign-up, future reset    | Yes            |
| `useSession()`           | Client-side session access           | Header, user menu, settings       | Yes            |
| `(dashboard)/layout.tsx` | One guard covering all private pages | Every dashboard route             | Yes            |

**Acceptance Criteria**

- [ ] Sign up with email → redirected to the dashboard
- [ ] Sign out → visiting `/dashboard` redirects to sign-in
- [ ] Google login works **on the deployed URL**
- [ ] Session survives a hard refresh
- [ ] Duplicate email registration shows a friendly error
- [ ] A `UserPreference` row exists for every new user

**Testing Checklist**

- [ ] E2E: sign-up → dashboard → sign-out → redirect
- [ ] Protected route redirects when logged out
- [ ] Password rules enforced client and server side
- [ ] Duplicate email rejected without leaking whether the account exists
- [ ] Session cookie is `httpOnly` and `secure` in production

**Potential Risks**

- _**(High)**_ Google OAuth redirect URIs differ per environment. **Register `http://localhost:3000/api/auth/callback/google` and the production callback up front.** Preview deployments get rotating URLs and will not work with Google — use email auth on previews and document that.
- _(High)_ `BETTER_AUTH_SECRET` must be ≥32 chars; `BETTER_AUTH_URL` must exactly match the deployed origin or callbacks fail silently.
- _(Medium)_ Better Auth CLI output may conflict with hand-written schema → always run the CLI first, then apply our models.

**Definition of Done**
Authentication works in production. Every subsequent feature may safely assume an authenticated `userId`.

---

### M3 — AI Review Engine _(headless)_

> **The highest-risk and highest-value milestone.** When it lands, the product exists.

**Objective**
Produce a real, schema-validated, persisted 13-section review — deliberately behind a plain, unstyled textarea.

**Why headless, and why here?** This is the only part of the project whose feasibility is genuinely uncertain: strict-mode schema compliance, prompt quality, and the 8,000 TPM budget are all proven here. Iterating on prompts _while_ simultaneously debugging Monaco is how a week disappears. Behind a textarea, every failure is unambiguously an AI-layer failure.

**Features**

- `ReviewResultSchema` — 13 sections, strict-compatible, zero optionals
- `z.toJSONSchema()` derivation into the Groq request
- Versioned system prompt with an explicit scoring rubric
- Groq client: `gpt-oss-120b`, `temperature: 0.2`, `strict: true`
- Token estimator + budget guard
- Quota service backed by `DailyUsage`
- Error taxonomy + `withApiHandler` wrapper
- Persist-first review flow
- Bounded retries: 429 honouring `retry-after`; one schema-repair attempt
- A plain form at `/review/new` rendering raw JSON

**Folder Changes**
`src/server/ai/{groq-client,prompt-builder,token-budget,review-schema-json}.ts` · `src/server/services/{review,quota}.service.ts` · `src/features/review/schemas/` · `src/lib/errors.ts` · `src/app/api/reviews/`

**Database Changes** — none. M1's schema already covers it. _(That is the point of designing the schema up front.)_

**API Routes**
`POST /api/reviews` · `GET /api/reviews/[id]` · `GET /api/usage`

**Frontend Components**
`RawReviewForm` (intentionally throwaway — replaced in M4), `<pre>` JSON dump

**Backend Components**
`groq-client.ts` (thin HTTP wrapper, no logic) · `prompt-builder.ts` (pure function) · `token-budget.ts` (pure) · `review.service.ts` (orchestration) · `quota.service.ts` · `errors.ts` (`AppError` + taxonomy) · `withApiHandler` (error→status mapping)

**Reusable Components**

| Component             | Why it exists                                         | Depended on by                            | Reusable                                  |
| --------------------- | ----------------------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| `ReviewResultSchema`  | **The contract the entire app is built on**           | M4 UI, M6 export, all tests               | Yes — most important artifact in the repo |
| `withApiHandler`      | Centralized error handling; no route writes try/catch | Every route handler                       | Yes                                       |
| `AppError` + taxonomy | One vocabulary for failure across all layers          | Services, routes, client toasts           | Yes                                       |
| `quotaService`        | Free-tier protection in exactly one place             | Review creation, usage endpoint, settings | Yes                                       |
| `tokenBudget`         | Prevents 429s before they happen                      | Review service, client meter (M4)         | Yes                                       |

**Acceptance Criteria**

- [ ] A buggy 100-line file returns all 13 sections, populated and Zod-validated
- [ ] Result persists with `overallScore`, token counts, and `latencyMs`
- [ ] Input >8,000 chars → `413 INPUT_TOO_LARGE` with actionable guidance
- [ ] Exhausted quota → `429 QUOTA_EXCEEDED`
- [ ] A forced malformed model response → `FAILED` row, never a crash
- [ ] `GET /api/usage` reports accurate remaining quota

**Testing Checklist**

- [ ] Unit: token estimator at boundaries (7,999 / 8,000 / 8,001 chars)
- [ ] Unit: prompt builder snapshot per language and review depth
- [ ] Unit: schema accepts golden fixtures; rejects malformed payloads
- [ ] Unit: quota increments, blocks at the cap, and resets across dates
- [ ] Integration: full create flow against a **mocked** Groq client
- [ ] Integration: 429 path honours `retry-after` and retries exactly once
- [ ] Manual: one real Groq call per supported language

**Potential Risks**

- _**(Highest in project)**_ Groq rejects the schema in strict mode → keep it flat, all-required, no unions or nested optionals; validate against the real API on day one of this milestone, not at the end.
- _**(High)**_ Token overrun → conservative caps plus the `includeRefactor` off-switch as the pressure-release valve.
- _(Medium)_ Score instability across runs → rubric anchors + `temperature: 0.2`. Full determinism is unattainable; document it honestly.
- _**(Process)**_ **Never call the real Groq API from CI.** It consumes the 1,000 RPD budget and makes builds flaky. Commit golden fixtures and mock the client.

**Definition of Done**
Reviews are real, validated, and persisted. The UI is ugly — and that is intentional and correct at this stage.

---

### M4 — Review Workspace UI

**Objective**
Turn M3's proven engine into the product experience.

**Features**

- Monaco Editor, dynamically imported with `ssr: false`
- Language selector driven by `config/languages.ts`
- File upload: read client-side, char-capped, language inferred from extension
- Live character/token meter with warning and error states
- `ReportView` composed of 13 section components
- Overall score gauge
- Staged skeleton loading (**no streaming — structured outputs forbid it**)
- Toast notifications and copy-to-clipboard

**Folder Changes**
`src/features/review/components/` · `src/features/review/components/sections/` · `src/features/review/hooks/` · `src/features/review/lib/`

**Database Changes** — none.

**API Routes** — none new. Consumes M3's.

**Frontend Components**
`CodeEditor` (Monaco wrapper), `LanguageSelect`, `FileDropzone`, `TokenMeter`, `ReviewForm`, `ReportView`, `ScoreGauge`, `ReviewSkeleton`, and the section set: `SummarySection`, `FindingList`, `ComplexitySection`, `RefactorSection`, `CommitMessageSection`, `PrDescriptionSection`

**Backend Components** — none new.

**Reusable Components**

| Component     | Why it exists                                               | Depended on by                               | Reusable                             |
| ------------- | ----------------------------------------------------------- | -------------------------------------------- | ------------------------------------ |
| `FindingList` | Bugs, security, performance, and smells share **one shape** | 4 sections                                   | Yes — **one component, four usages** |
| `CodeBlock`   | Syntax-highlighted read-only code                           | Refactor section, export preview, demo pages | Yes                                  |
| `ScoreBadge`  | Score rendering with consistent colour thresholds           | Workspace, dashboard cards (M5)              | Yes                                  |
| `SectionCard` | Uniform section frame: title, icon, body                    | All 13 sections                              | Yes                                  |
| `TokenMeter`  | Makes an invisible constraint visible to the user           | Review form, settings                        | Yes                                  |
| `EmptyState`  | Consistent "nothing here yet" treatment                     | Workspace, dashboard, search                 | Yes                                  |

**Acceptance Criteria**

- [ ] Paste or upload → structured report renders in all 13 sections
- [ ] Over-limit input is blocked **before** any network request
- [ ] Skeletons display during the 20–90s wait with honest progress copy
- [ ] Failures render a Retry affordance rather than a dead end
- [ ] Fully usable at 375px width
- [ ] Monaco is absent from the initial bundle (verify in the network tab)

**Testing Checklist**

- [ ] Every section renders correctly for empty arrays and `"N/A"` values
- [ ] Upload rejects oversized files and unsupported extensions
- [ ] Language auto-inference is correct for all five languages
- [ ] A11y: editor reachable by keyboard, all controls labelled, focus visible
- [ ] Responsive at 375 / 768 / 1440
- [ ] Monaco lazy-loads (confirmed in the network panel)

**Potential Risks**

- _(High)_ Monaco bundle bloat → dynamic import plus loading only the five required language workers.
- _(High)_ Perceived slowness with no streaming available → staged skeletons and honest messaging ("Analyzing structure… Checking for bugs…"). Do not fake a progress bar.
- _(Medium)_ Monaco theme flash on toggle → sync the editor theme to the app theme in an effect.

**Definition of Done**
A stranger can use the app without instructions.

---

### M5 — Dashboard, History, Search & Favorites

**Objective**
Full lifecycle control over a user's own reviews.

**Features**

- Cursor-paginated dashboard
- `ReviewCard` showing score, language, date, favorite state
- Debounced title search
- Language and favorites-only filters
- Optimistic favorite toggle with visible rollback on error
- Delete with confirmation, optimistic removal, and an undo toast
- Retry action for `FAILED` reviews
- Empty, loading, and error states throughout
- Usage/quota widget

**Folder Changes**
`src/features/history/{components,hooks}`

**Database Changes**
Add a `pg_trgm` GIN index on `Review.title` to make `ILIKE` search index-backed.

**API Routes**
`GET /api/reviews` (search, filter, cursor paginate) · `PATCH /api/reviews/[id]` · `DELETE /api/reviews/[id]` · `POST /api/reviews/[id]/retry`

**Frontend Components**
`DashboardPage`, `ReviewList`, `ReviewCard`, `SearchInput`, `LanguageFilter`, `FavoriteToggle`, `DeleteReviewDialog`, `UsageMeter`, `LoadMoreButton`

**Backend Components**
`review.service.ts` extended with `list`, `update`, `remove`, `retry`; `review.repository.ts` extended with cursor pagination and search.

**Reusable Components**

| Component           | Why it exists                                         | Depended on by                            | Reusable        |
| ------------------- | ----------------------------------------------------- | ----------------------------------------- | --------------- |
| `ReviewCard`        | One review summary representation                     | Dashboard, search, favorites, demo        | Yes             |
| `ConfirmDialog`     | Never delete without confirmation                     | Delete review, future destructive actions | Yes             |
| `SearchInput`       | Debounce logic written once                           | Dashboard; future global search           | Yes             |
| `queryKeys` factory | **Ad-hoc key strings are the #1 cause of cache bugs** | Every TanStack Query hook                 | Yes — mandatory |
| `UsageMeter`        | Surfaces the free-tier ceiling honestly               | Dashboard, settings                       | Yes             |

**Acceptance Criteria**

- [ ] Reviews list newest-first and paginate without duplicates or gaps
- [ ] Search filters by title, case-insensitively
- [ ] Favorite toggles instantly and **visibly rolls back** when the server fails
- [ ] Delete requires confirmation and offers undo
- [ ] Requesting another user's review ID returns **404, not 403** (no existence leak)
- [ ] `FAILED` reviews expose a working Retry

**Testing Checklist**

- [ ] **Security: ownership isolation** — user B cannot read, patch, or delete user A's review
- [ ] Optimistic rollback verified on a forced server error
- [ ] Pagination produces no duplicates or gaps across pages
- [ ] Search is case-insensitive and handles empty results
- [ ] Deleting a user cascades to their reviews

**Potential Risks**

- _**(High — security)**_ IDOR. **Ownership must be enforced inside the query (`where: { id, userId }`), never by fetching then comparing in code.** This is explicitly tested.
- _(Medium)_ Optimistic rollback correctness → test the _failure_ path, not only the happy path.
- _(Low)_ Debounce thrash → 300ms plus `keepPreviousData` to prevent list flicker.

**Definition of Done**
Users have complete, safe control over their own data.

---

### M6 — Export

**Objective**
Let reviews leave the application as shareable artifacts.

**Features**

- Markdown serializer — a pure function, served with `Content-Disposition`
- PDF export via `@react-pdf/renderer`, client-side and lazy-loaded
- Copy-as-Markdown to clipboard
- Export actions on the review page and dashboard cards

**Folder Changes**
`src/features/export/lib/{to-markdown.ts,to-pdf.tsx}` · `src/features/export/components/ExportMenu.tsx`

**Database Changes** — none.

**API Routes**
`GET /api/reviews/[id]/export?format=md`

**Frontend Components**
`ExportMenu`, `PdfDocument` (react-pdf layout), `CopyMarkdownButton`

**Backend Components**
`export.service.ts` wrapping `toMarkdown()`

**Reusable Components**

| Component      | Why it exists                                                                    | Depended on by                                 | Reusable                        |
| -------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------- |
| `toMarkdown()` | **One pure function** serving download, clipboard, and future GitHub PR comments | Export route, copy button, future integrations | Yes — written once, tested once |
| `ExportMenu`   | Consistent export affordance                                                     | Review page, dashboard cards                   | Yes                             |

**Why not Puppeteer or Playwright for PDF?** A headless Chromium binary blows past Vercel's 250 MB bundle limit and is far too slow for the Hobby tier. Client-side `@react-pdf/renderer` keeps the server bundle clean and moves rendering cost to the user's browser — free, and it scales at zero marginal cost.

**Acceptance Criteria**

- [ ] Markdown export opens correctly in any Markdown viewer
- [ ] PDF is multi-page, readable, and paginates without clipping code
- [ ] The PDF library is absent from the initial JS bundle
- [ ] Export works for `FAILED` reviews (metadata only, no crash)

**Testing Checklist**

- [ ] Markdown snapshot test against a golden fixture
- [ ] PDF generates for both minimal and maximal payloads
- [ ] Unicode, emoji, and Markdown special characters survive escaping
- [ ] Long code lines wrap rather than overflow the page
- [ ] Lazy-loading confirmed in the network panel

**Potential Risks**

- _(Medium)_ `@react-pdf/renderer` supports only a CSS subset — **do not attempt to reuse Tailwind components inside it.** Build a small, dedicated document layout.
- _(Low)_ Markdown injection from AI output → escape backticks and fenced blocks when serializing.

**Definition of Done**
Every review, in every state, exports cleanly to both formats.

---

### M7 — Settings, Polish & Portfolio Hardening

**Objective**
Take the application from "working" to "hire this person".

**Features**

- Settings: profile, theme, default language, review depth, `includeRefactor`
- Usage and quota dashboard
- **Public `/demo/[slug]` seeded reviews — no auth, no AI call, no quota consumed**
- Route-level error boundaries and `not-found` pages
- Accessibility pass: focus traps, ARIA, contrast, keyboard paths
- Metadata and Open Graph tags
- README with architecture diagram
- **GitHub Actions daily cron pinging `/api/health`**

**Folder Changes**
`src/features/settings/` · `src/app/demo/[slug]/` · `.github/workflows/keepalive.yml` · `src/app/**/error.tsx` · `not-found.tsx`

**Database Changes**
Seed data for public demo reviews (pre-generated, committed as fixtures).

**API Routes**
`GET /api/preferences` · `PATCH /api/preferences`

**Frontend Components**
`SettingsForm`, `ProfileSection`, `AiPreferencesSection`, `ThemeSection`, `UsagePanel`, `DemoReviewPage`, `ErrorBoundary`, `NotFound`

**Backend Components**
`preference.service.ts` — and preferences must genuinely alter prompt construction, not merely persist.

**Reusable Components**

| Component         | Why it exists                      | Depended on by              | Reusable |
| ----------------- | ---------------------------------- | --------------------------- | -------- |
| `ErrorBoundary`   | No route ever shows a white screen | Every route segment         | Yes      |
| `SettingsSection` | Consistent settings layout         | All settings groups         | Yes      |
| `PageHeader`      | Uniform page titling               | Dashboard, settings, review | Yes      |

**Acceptance Criteria**

- [ ] Preferences persist **and measurably change prompt behaviour**
- [ ] Demo pages load fully logged-out and consume zero quota
- [ ] Every route has loading, error, and empty states
- [ ] Lighthouse accessibility ≥ 95
- [ ] Keepalive cron runs green on schedule
- [ ] README explains the architecture and its trade-offs

**Testing Checklist**

- [ ] Full E2E: sign-up → review → favorite → search → export → delete
- [ ] Accessibility audit passes (axe or Lighthouse)
- [ ] Mobile pass across all pages
- [ ] **Cold-start check after 3 days idle** — confirms the keepalive works
- [ ] Demo pages render without a session

**Potential Risks**

- _**(Highest portfolio risk)**_ **Supabase pauses free projects after 7 days of inactivity** — a recruiter clicking a dead link is the worst possible failure. Mitigated by the daily cron. **Backstop:** GitHub disables scheduled workflows after 60 days of repository inactivity, so schedule a monthly commit or add a second independent pinger.
- _(Low)_ Demo seed data drifting from the current schema → generate it from the same Zod schema and validate it in CI.

**Definition of Done**
You would send this link to a hiring manager unprompted.

---

## 5. Dependency Graph

```
                     M0  Foundation + Deployment
                              │
                              ▼
                     M1  Data Layer (Prisma + Supabase)
                              │  provides: tables for auth
                              ▼
                     M2  Authentication
                              │  provides: guaranteed userId
                              ▼
                     M3  AI Review Engine (headless)
                              │  provides: ReviewResultSchema + persisted rows
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        M4 Workspace    M5 Dashboard     M6 Export
        (needs the      (needs Review    (needs the
      ReviewResult        rows to        ReviewResult
        contract)          list)           contract)
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                     M7  Settings + Polish
```

**Edge justification**

| Edge          | Why it is a hard dependency                                                     |
| ------------- | ------------------------------------------------------------------------------- |
| M0 → M1       | Prisma needs a project and a build pipeline to deploy into                      |
| M1 → M2       | Better Auth **stores** users and sessions in Postgres via Prisma                |
| M2 → M3       | Reviews are owned by a user; quota is per-user                                  |
| M3 → M4       | The UI renders `ReviewResultSchema`; building UI first means guessing the shape |
| M3 → M5       | The dashboard lists rows that only M3 can create                                |
| M3 → M6       | Export serializes the result contract                                           |
| M4,M5,M6 → M7 | Polish requires surfaces to polish                                              |

**The true critical path is `M1 → M2 → M3`.** Everything after is presentation over an already-proven contract. **M4, M5, and M6 are mutually independent** and may be reordered or parallelized freely — which is precisely the payoff of designing a stable schema contract up front.

---

## 6. Folder Creation Order

Folders are created **only when a milestone needs them**. Empty scaffolding rots and misleads.

| Milestone | Folders introduced                                                                     |
| --------- | -------------------------------------------------------------------------------------- |
| M0        | `app/(marketing)` · `components/ui` · `components/shared` · `lib` · `config` · `tests` |
| M1        | `prisma` · `server/repositories` · `lib/db.ts` · `app/api/health`                      |
| M2        | `app/(auth)` · `app/(dashboard)` · `features/auth` · `server/auth` · `app/api/auth`    |
| M3        | `server/ai` · `server/services` · `features/review/schemas` · `app/api/reviews`        |
| M4        | `features/review/{components,hooks,lib}`                                               |
| M5        | `features/history`                                                                     |
| M6        | `features/export`                                                                      |
| M7        | `features/settings` · `app/demo` · `.github/workflows/keepalive.yml`                   |

---

## 7. Testing Strategy

Deliberately a thin pyramid. This is a portfolio project: tests target the logic a reviewing engineer would actually question, not a coverage percentage.

| Layer       | Tool                  | Scope                                                                                |
| ----------- | --------------------- | ------------------------------------------------------------------------------------ |
| Unit        | Vitest                | Token estimator, prompt builder, schema validation, `toMarkdown()`, quota arithmetic |
| Component   | React Testing Library | Report sections vs golden payloads, form validation, optimistic rollback             |
| Integration | Vitest                | Route handlers with a **mocked** Groq client and a test database                     |
| E2E         | Playwright            | One full happy path + the auth-protection path                                       |
| CI          | GitHub Actions        | typecheck → lint → unit → build on every PR                                          |

**Highest value per minute invested:** the pure functions in `server/ai/`. They encode the constraints that make or break the product and they test in milliseconds.

**Non-negotiable rules**

1. **The real Groq API is never called from automated tests.** It burns the 1,000 RPD budget and produces flaky builds. Golden fixtures are captured by hand once and committed.
2. **Ownership isolation is always tested.** User B must never read, modify, or delete user A's review.
3. Optimistic-update tests must cover the **failure** path.

**Explicitly not doing:** whole-page snapshot tests (brittle), coverage targets (gameable), or testing Prisma itself (that's Prisma's job).

---

## 8. Deployment Strategy

**Pipeline**

```
feature branch → PR → CI (typecheck·lint·test·build) + Vercel Preview
                   ↓ merge
                 main → Vercel Production → Supabase
```

**Configuration**

- `postinstall`: `prisma generate`
- Build: `prisma migrate deploy && next build`
- `maxDuration` set explicitly on `POST /api/reviews` (Hobby ceiling: 300s)

**Environment variables (Vercel)**

| Variable                                    | Purpose                                         |
| ------------------------------------------- | ----------------------------------------------- |
| `DATABASE_URL`                              | Pooled connection, port 6543, `?pgbouncer=true` |
| `DIRECT_URL`                                | Direct connection, port 5432 — migrations only  |
| `BETTER_AUTH_SECRET`                        | ≥32 characters                                  |
| `BETTER_AUTH_URL`                           | Must exactly match the deployed origin          |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth                                           |
| `GROQ_API_KEY`                              | AI provider                                     |

**Keepalive.** A daily GitHub Actions cron calls `GET /api/health`, performing a real DB query and preventing Supabase's 7-day pause.

**Cost breakdown**

| Service          | Tier               | Cost   |
| ---------------- | ------------------ | ------ |
| Supabase         | Free (500 MB)      | ₹0     |
| Vercel           | Hobby              | ₹0     |
| Groq             | Free               | ₹0     |
| GitHub + Actions | Free (public repo) | ₹0     |
| All libraries    | MIT / Apache-2.0   | ₹0     |
| **Total**        |                    | **₹0** |

> **Worth knowing:** Vercel's Hobby tier prohibits commercial use. Perfect for a portfolio, but the "SaaS" in the tagline cannot be monetized on this tier without upgrading.

---

## 9. Architecture Self-Review

Surfaced deliberately, so an interviewer does not find them first. Knowing your system's weaknesses is a senior trait.

**1. The 8,000 TPM ceiling is the product's real limit.**
At ~6,000 tokens per review, the _account-wide_ ceiling is roughly 30 reviews/day and about one per minute. This is a personal tool wearing a SaaS costume. _Mitigations:_ per-user daily quota, honest UI messaging, zero-cost seeded demo reviews, and `gpt-oss-20b` as a degraded fallback.

**2. "Refactored Code" is the weakest feature as specified — recommend changing it.**
A full rewrite of a 250-line file can consume the entire output budget alone, and whole-file rewrites are exactly what senior reviewers _don't_ produce. **Recommendation: emit targeted patches — before/after snippets with line anchors — instead of a full rewrite.** Cheaper in tokens, more useful to the user, and far more credible as "senior engineer" behaviour. _This is a deliberate deviation from the original brief and is argued for on its merits._

**3. Time/space complexity is meaningless for non-algorithmic code.**
Asked to state complexity for a React component, a model will invent one. The prompt must explicitly permit `"N/A"` with a justification, and the UI must render that gracefully rather than displaying a fabricated `O(n)`.

**4. Overall Score is non-deterministic.**
The same file may score 72 on one run and 78 on the next. `temperature: 0.2` plus explicit rubric anchors narrows the spread; true stability is unattainable with an LLM. The README should state this plainly rather than implying false precision.

**5. Single-file review only in the MVP.**
No cross-file context means genuinely architectural problems spanning modules cannot be caught. Documented as a known limitation rather than left for a reviewer to discover.

**6. PR-diff review appears in the tagline but not the MVP.**
Deliberately deferred: diffs consume more tokens for less signal at this budget. Either scope it to M8 or soften the tagline. Do not ship a half-working version.

**Simplifications already applied**
No job queue (persist-first covers it) · no Redis (Postgres `DailyUsage`) · no normalized result tables (JSON + one denormalized column) · no Server Actions (single mutation path) · no tokenizer dependency (`chars/4`) · no Puppeteer (client-side PDF).

**Alternatives considered and rejected**

| Alternative                     | Why rejected                                                     |
| ------------------------------- | ---------------------------------------------------------------- |
| Streaming review UX             | Incompatible with strict structured outputs                      |
| Two-pass summary-then-structure | Doubles token cost against an 8,000 TPM budget                   |
| LangChain                       | Banned dependency — and one HTTP call needs no framework         |
| Background job queue            | Requires Redis/paid infra; 300s Hobby limit makes it unnecessary |
| Normalized result tables        | Joins and migrations for zero query benefit                      |
| Microservices                   | Vercel + Supabase _is_ the entire backend                        |

---

## 10. Risks Register

| #   | Risk                                   | Severity     | Milestone | Mitigation                                                          |
| --- | -------------------------------------- | ------------ | --------- | ------------------------------------------------------------------- |
| R1  | Groq rejects the schema in strict mode | **Critical** | M3        | Flat, all-required schema; validate against the live API on day one |
| R2  | Supabase pauses after 7 days idle      | **Critical** | M7        | Daily GitHub Actions ping; monthly commit as backstop               |
| R3  | Wrong pooled/direct URL split          | High         | M1        | Verify both locally _and_ on Vercel during M1                       |
| R4  | IDOR — cross-user data access          | High         | M5        | Ownership enforced in the `where` clause; explicitly tested         |
| R5  | Google OAuth redirect mismatch         | High         | M2        | Register all origins up front; email auth on previews               |
| R6  | Token budget overrun → 429s            | High         | M3        | Conservative caps + `includeRefactor` off-switch                    |
| R7  | CI burning the Groq daily quota        | Medium       | M3        | Mock the client; commit golden fixtures                             |
| R8  | Monaco bundle bloat                    | Medium       | M4        | Dynamic import; five language workers only                          |
| R9  | Score non-determinism                  | Medium       | M3        | Rubric anchors + `temperature: 0.2`; document honestly              |
| R10 | Perceived slowness (no streaming)      | Medium       | M4        | Staged skeletons; honest copy; never a fake progress bar            |
| R11 | 500 MB storage cap                     | Low          | M1        | 8 KB source cap ⇒ ~50,000 reviews fit                               |
| R12 | react-pdf CSS subset surprises         | Low          | M6        | Dedicated document layout; no Tailwind reuse                        |

---

## 11. Future Enhancements

Ordered by value-to-effort. **None of these require re-architecting** — that is the test of a sound design.

| #   | Enhancement                       | Notes                                                              |
| --- | --------------------------------- | ------------------------------------------------------------------ |
| F1  | **Refactor-as-patches**           | Should arguably be in the MVP — see §9.2                           |
| F2  | **GitHub PR diff review**         | Fulfils the tagline. Needs a diff parser and a larger token budget |
| F3  | **Next.js 16 upgrade**            | Turbopack + React Compiler. One-time migration                     |
| F4  | Multi-file / repository review    | Requires chunking and a map-reduce prompt strategy                 |
| F5  | Review comparison (diff two runs) | Schema already supports it — pure UI work                          |
| F6  | Shareable public review links     | Add `shareSlug` + `isPublic` to `Review`                           |
| F7  | GitHub App integration            | Auto-comment on PRs. Needs a webhook receiver                      |
| F8  | Team workspaces                   | Add `Organization` + `Membership`; scope reviews by `orgId`        |
| F9  | Stripe billing                    | Only viable after leaving Vercel Hobby                             |
| F10 | Self-hosted model fallback        | Removes the Groq rate-limit ceiling entirely                       |

---

## 12. Definition of Done — Whole Project

The project is complete when a reviewer can, unaided:

1. Visit the live URL and read a public demo review **without signing in**
2. Sign up with Google in under 30 seconds
3. Paste a buggy Python file and receive a 13-section structured review
4. Favorite it, find it by search, and export it to Markdown and PDF
5. Delete it and observe the quota update in settings
6. Sign out and confirm `/dashboard` redirects
7. Read `README.md` and understand the architecture and its trade-offs
8. Clone the repo, run `npm install && npm run dev`, and be productive in under five minutes

**Total infrastructure cost: ₹0.**
