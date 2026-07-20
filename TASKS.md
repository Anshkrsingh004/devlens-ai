# DevLens AI — Implementation Checklist

> The executable task list. Every task is scoped to **under 2 hours**.
> Companion to `IMPLEMENTATION_ROADMAP.md`.

---

## How To Use This File

- Work **top to bottom**. Tasks are ordered so dependencies are always already satisfied.
- Do not start a milestone until the previous one's **Definition of Done** passes.
- `Depends` refers to task IDs. `—` means no blocker.
- Check the box only when the task is _done and verified_, not merely written.

**Difficulty scale**

| Level     | Meaning                                       |
| --------- | --------------------------------------------- |
| ⬤ Easy    | Mechanical. Follow the docs.                  |
| ⬤⬤ Medium | Requires judgement or touches multiple files. |
| ⬤⬤⬤ Hard  | Genuine uncertainty. Expect iteration.        |

**Effort summary**

| Milestone                  |   Tasks |  Estimate |
| -------------------------- | ------: | --------: |
| M0 Foundation & Deployment |      18 |      ~13h |
| M1 Data Layer              |      14 |      ~11h |
| M2 Authentication          |      17 |      ~15h |
| M3 AI Review Engine        |      22 |      ~26h |
| M4 Review Workspace UI     |      21 |      ~22h |
| M5 Dashboard & History     |      19 |      ~18h |
| M6 Export                  |      11 |       ~9h |
| M7 Settings & Polish       |      19 |      ~17h |
| **Total**                  | **141** | **~131h** |

> At ~15h/week this is roughly a 9-week project; at ~30h/week, about 4–5 weeks. **M3 is the milestone most likely to overrun** — its estimate already carries deliberate slack for prompt iteration.

---

## M0 — Foundation & Live Deployment Pipeline

**Goal:** a deployed app on a public URL with CI green, before any feature exists.

| ID   | Task                                                                    | Depends | Difficulty | Est. | ☑   |
| ---- | ----------------------------------------------------------------------- | ------- | ---------- | ---: | --- |
| 0.1  | Initialize git repo; create GitHub repository (public)                  | —       | ⬤          |  15m | ☑   |
| 0.2  | Scaffold Next.js 15 + TypeScript + App Router + `src/` dir              | 0.1     | ⬤          |  20m | ☑   |
| 0.3  | Enable TS `strict`; add `@/*` path alias                                | 0.2     | ⬤          |  15m | ☑   |
| 0.4  | Install and configure TailwindCSS                                       | 0.2     | ⬤          |  20m | ☑   |
| 0.5  | Init shadcn/ui; pin versions per the Next 15 guide                      | 0.4     | ⬤⬤         |  30m | ☑   |
| 0.6  | Add base shadcn primitives (button, card, input, dialog, toast, select) | 0.5     | ⬤          |  20m | ☑   |
| 0.7  | Configure ESLint + Prettier + import-order rules                        | 0.3     | ⬤          |  30m | ☑   |
| 0.8  | Add ESLint `no-restricted-imports` enforcing layer boundaries           | 0.7     | ⬤⬤         |  40m | ☑   |
| 0.9  | Create `lib/env.ts` — Zod-validated env, fails at boot                  | 0.3     | ⬤⬤         |  40m | ☑   |
| 0.10 | Create `config/site.ts` and `config/limits.ts`                          | 0.3     | ⬤          |  20m | ☑   |
| 0.11 | Build root layout: fonts, metadata, `ThemeProvider`                     | 0.6     | ⬤⬤         |  45m | ☑   |
| 0.12 | Build `ThemeToggle` with persistence                                    | 0.11    | ⬤⬤         |  40m | ☑   |
| 0.13 | Build `Container`, `AppShell`, `PageHeader` shared components           | 0.11    | ⬤⬤         |  50m | ☑   |
| 0.14 | Build the marketing landing page (hero, features, CTA)                  | 0.13    | ⬤⬤         |  90m | ☑   |
| 0.15 | Set up Vitest + React Testing Library                                   | 0.3     | ⬤⬤         |  40m | ☑   |
| 0.16 | Set up Playwright; write a smoke test for `/`                           | 0.14    | ⬤⬤         |  45m | ☑   |
| 0.17 | Create `.github/workflows/ci.yml` (typecheck·lint·test·build)           | 0.16    | ⬤⬤         |  40m | ☑   |
| 0.18 | Connect Vercel; deploy; verify the live URL                             | 0.17    | ⬤⬤         |  40m | ☑   |

**Definition of Done**
☑ Public URL renders the landing page ☑ CI passes on a PR ☑ Missing env var fails the build readably ☑ Theme toggles and persists

---

## M1 — Data Layer

**Goal:** Supabase connected, schema migrated, repositories proven **in production**.

| ID   | Task                                                                           | Depends   | Difficulty | Est. | ☑   |
| ---- | ------------------------------------------------------------------------------ | --------- | ---------- | ---: | --- |
| 1.1  | Create Supabase project; record both connection strings                        | 0.18      | ⬤          |  20m | ☑   |
| 1.2  | Install Prisma 7; init schema with the `output` path (v7 requirement)          | 1.1       | ⬤          |  25m | ☑   |
| 1.3  | Configure `DATABASE_URL` (:6543 `?pgbouncer=true`) + `DIRECT_URL` (:5432)      | 1.2       | ⬤⬤⬤        |  45m | ☑   |
| 1.4  | Add both URLs to `lib/env.ts` validation                                       | 1.3, 0.9  | ⬤          |  15m | ☑   |
| 1.5  | Create `lib/db.ts` Prisma singleton (global cache for HMR)                     | 1.2       | ⬤⬤         |  30m | ☑   |
| 1.6  | Define enums: `Language`, `SourceType`, `ReviewStatus`, `Theme`, `ReviewDepth` | 1.2       | ⬤          |  25m | ☑   |
| 1.7  | Define the `Review` model with all columns                                     | 1.6       | ⬤⬤         |  45m | ☑   |
| 1.8  | Define `DailyUsage` with `@@unique([userId, date])`                            | 1.6       | ⬤          |  25m | ☑   |
| 1.9  | Define `UserPreference` with unique `userId`                                   | 1.6       | ⬤          |  25m | ☑   |
| 1.10 | Add indexes per `DATABASE.md` §3                                               | 1.7       | ⬤⬤         |  30m | ☑   |
| 1.11 | Run the first migration; verify in the Supabase dashboard                      | 1.10      | ⬤⬤         |  30m | ☑   |
| 1.12 | Build `review.repository.ts` (create, findById, update)                        | 1.11, 1.5 | ⬤⬤         |  60m | ☑   |
| 1.13 | Build `usage.repository.ts` + `preference.repository.ts`                       | 1.11, 1.5 | ⬤⬤         |  50m | ☑   |
| 1.14 | Build `GET /api/health` with a real `SELECT 1`; verify **on Vercel**           | 1.12      | ⬤⬤         |  40m | ☑   |

> ⚠️ **Task 1.3 is the highest-risk task in this milestone.** Getting the pooled/direct split wrong produces hanging migrations or `prepared statement already exists` in production — expensive to diagnose later. Verify **both** locally and on Vercel before moving on.

**Definition of Done**
☑ Migration applies to a clean DB ☑ `/api/health` green **on the deployed URL** ☑ Repository tests pass ☑ Schema committed

---

## M2 — Authentication

**Goal:** real users can sign up, sign in, and reach a protected dashboard.

| ID   | Task                                                                          | Depends    | Difficulty | Est. | ☑   |
| ---- | ----------------------------------------------------------------------------- | ---------- | ---------- | ---: | --- |
| 2.1  | Install Better Auth; add `BETTER_AUTH_SECRET`/`URL` to env validation         | 1.14       | ⬤          |  25m | ☑   |
| 2.2  | Create `server/auth/auth.ts` with the Prisma adapter                          | 2.1, 1.5   | ⬤⬤         |  45m | ☑   |
| 2.3  | Run the Better Auth CLI to generate auth tables; migrate                      | 2.2        | ⬤⬤         |  40m | ☑   |
| 2.4  | Add `userId` FKs + cascade to `Review`/`DailyUsage`/`UserPreference`; migrate | 2.3        | ⬤⬤         |  40m | ☑   |
| 2.5  | Enable email/password auth                                                    | 2.2        | ⬤          |  30m | ☑   |
| 2.6  | Create Google OAuth credentials; register **all** redirect URIs               | 2.2        | ⬤⬤⬤        |  50m | ☑   |
| 2.7  | Enable the Google provider in Better Auth config                              | 2.6        | ⬤⬤         |  30m | ☑   |
| 2.8  | Mount `app/api/auth/[...all]/route.ts` via `toNextJsHandler`                  | 2.5        | ⬤          |  20m | ☑   |
| 2.9  | Create the auth client (`features/auth/lib/auth-client.ts`)                   | 2.8        | ⬤          |  25m | ☑   |
| 2.10 | Write sign-in and sign-up Zod schemas                                         | 2.9        | ⬤          |  25m | ☑   |
| 2.11 | Build `AuthCard` shared shell                                                 | 2.10, 0.13 | ⬤          |  30m | ☑   |
| 2.12 | Build `SignUpForm` (RHF + Zod + error states)                                 | 2.11       | ⬤⬤         |  70m | ☑   |
| 2.13 | Build `SignInForm`                                                            | 2.11       | ⬤⬤         |  60m | ☑   |
| 2.14 | Build `GoogleButton` with loading state                                       | 2.7, 2.11  | ⬤⬤         |  40m | ☑   |
| 2.15 | Build `server/auth/guards.ts` — `requireSession`, `getOptionalSession`        | 2.8        | ⬤⬤         |  45m | ☑   |
| 2.16 | Build `(dashboard)/layout.tsx` with the session guard + `middleware.ts`       | 2.15       | ⬤⬤⬤        |  70m | ☑   |
| 2.17 | Build `UserMenu` with sign-out; auto-create `UserPreference` on sign-up       | 2.16, 1.13 | ⬤⬤         |  60m | ☑   |

> ⚠️ **Task 2.6:** register `http://localhost:3000/api/auth/callback/google` **and** the production callback now. Vercel preview deployments get rotating URLs and will not work with Google — use email auth on previews and document that.

**Definition of Done**
☑ Sign-up → dashboard ☑ Sign-out → `/dashboard` redirects ☑ Google login works **in production** ☑ Session survives refresh ☑ Every user has preferences

---

## M3 — AI Review Engine _(headless)_

**Goal:** real, validated, persisted reviews behind a deliberately plain textarea.

> **The highest-risk milestone.** Do 3.1–3.5 **first** and validate against the live Groq API on day one. If strict mode rejects the schema, everything downstream shifts.

| ID   | Task                                                               | Depends          | Difficulty | Est. | ☑   |
| ---- | ------------------------------------------------------------------ | ---------------- | ---------- | ---: | --- |
| 3.1  | Define the `Finding` and `Suggestion` Zod schemas                  | 2.17             | ⬤⬤         |  40m | ☑   |
| 3.2  | Define `ReviewResultSchema` — 13 sections, **zero optionals**      | 3.1              | ⬤⬤⬤        |  90m | ☑   |
| 3.3  | Derive the Groq JSON schema via `z.toJSONSchema()`                 | 3.2              | ⬤⬤         |  45m | ☑   |
| 3.4  | Add `GROQ_API_KEY` to env validation                               | 3.2, 0.9         | ⬤          |  10m | ☑   |
| 3.5  | **Spike:** verify strict mode accepts the schema against live Groq | 3.3, 3.4         | ⬤⬤⬤        |  90m | ☑   |
| 3.6  | Write `server/ai/system-prompt.ts` with an explicit scoring rubric | 3.5              | ⬤⬤⬤        |  90m | ☑   |
| 3.7  | Build `prompt-builder.ts` (pure; language + depth aware)           | 3.6              | ⬤⬤         |  60m | ☑   |
| 3.8  | Build `token-budget.ts` — estimator + `assertFits`                 | 0.10             | ⬤⬤         |  50m | ☑   |
| 3.9  | Build `groq-client.ts` — thin HTTP wrapper, zero logic             | 3.4              | ⬤⬤         |  50m | ☑   |
| 3.10 | Build `lib/errors.ts` — `AppError` + the full taxonomy             | 2.15             | ⬤⬤         |  50m | ☑   |
| 3.11 | Build `lib/api-handler.ts` — `withApiHandler` error mapping        | 3.10             | ⬤⬤         |  50m | ☑   |
| 3.12 | Build `quota.service.ts` — assert, record, atomic upsert           | 1.13, 3.10       | ⬤⬤         |  60m | ☑   |
| 3.13 | Build `review.service.ts` — persist-first orchestration            | 3.7, 3.9, 3.12   | ⬤⬤⬤        | 100m | ☑   |
| 3.14 | Add retry logic: Groq 429 (`retry-after`) + one schema repair      | 3.13             | ⬤⬤⬤        |  80m | ☑   |
| 3.15 | Write the `ReviewInputSchema` (shared client/server)               | 3.2, 0.10        | ⬤          |  30m | ☑   |
| 3.16 | Build `POST /api/reviews`                                          | 3.13, 3.11, 3.15 | ⬤⬤         |  60m | ☑   |
| 3.17 | Build `GET /api/reviews/[id]` with owner-scoped `where`            | 3.16             | ⬤⬤         |  40m | ☑   |
| 3.18 | Build `GET /api/usage`                                             | 3.12, 3.11       | ⬤          |  30m | ☑   |
| 3.19 | Build the **plain** review form + raw JSON render at `/review/new` | 3.16             | ⬤          |  45m | ☑   |
| 3.20 | Capture golden fixtures; write schema accept/reject tests          | 3.5              | ⬤⬤         |  60m | ☑   |
| 3.21 | Unit tests: token estimator boundaries, prompt builder, quota      | 3.8, 3.12        | ⬤⬤         |  70m | ☑   |
| 3.22 | Integration test: full flow with a **mocked** Groq client          | 3.16, 3.20       | ⬤⬤⬤        |  80m | ☑   |

> ⚠️ **Never call the real Groq API from CI.** It consumes the 1,000 RPD budget and makes builds flaky. Mock the client; use committed fixtures.

**Definition of Done**
☑ A buggy file returns all 13 populated sections ☑ Result persists with score + tokens ☑ >8000 chars → 413 ☑ Quota exhaustion → 429 ☑ Malformed response → `FAILED` row, no crash

---

## M4 — Review Workspace UI

**Goal:** turn the proven engine into the product experience.

| ID   | Task                                                                                   | Depends       | Difficulty | Est. | ☑   |
| ---- | -------------------------------------------------------------------------------------- | ------------- | ---------- | ---: | --- |
| 4.1  | Populate `config/languages.ts` (label, Monaco id, extensions)                          | 3.19          | ⬤          |  25m | ☑   |
| 4.2  | Install `@monaco-editor/react`; build `CodeEditor` with `ssr:false`                    | 4.1           | ⬤⬤⬤        |  80m | ☑   |
| 4.3  | Sync the Monaco theme to the app theme                                                 | 4.2, 0.12     | ⬤⬤         |  45m | ☑   |
| 4.4  | Build `LanguageSelect`                                                                 | 4.1           | ⬤          |  30m | ☑   |
| 4.5  | Build `FileDropzone` — cap + extension→language inference                              | 4.1           | ⬤⬤         |  70m | ☑   |
| 4.6  | Build `TokenMeter` with ok/warn/error states                                           | 3.8, 4.1      | ⬤⬤         |  50m | ☑   |
| 4.7  | Set up the TanStack Query provider                                                     | 2.17          | ⬤          |  25m | ☑   |
| 4.8  | Build `lib/query-keys.ts` factory                                                      | 4.7           | ⬤⬤         |  30m | ☑   |
| 4.9  | Build `lib/api-client.ts` — typed fetch, envelope unwrapping                           | 3.11, 4.8     | ⬤⬤         |  50m | ☑   |
| 4.10 | Build `useCreateReview` (long timeout, error mapping)                                  | 4.9           | ⬤⬤         |  50m | ☑   |
| 4.11 | Build `ReviewForm` composing editor + select + dropzone + meter                        | 4.2–4.6, 4.10 | ⬤⬤         |  80m | ☑   |
| 4.12 | Build `SectionCard` shared frame                                                       | 0.13          | ⬤          |  30m | ☑   |
| 4.13 | Build `ScoreBadge` + `ScoreGauge` with colour thresholds                               | 4.12          | ⬤⬤         |  55m | ☑   |
| 4.14 | Build `CodeBlock` (read-only, highlighted)                                             | 4.2           | ⬤⬤         |  45m | ☑   |
| 4.15 | Build **`FindingList`** — one component, four usages                                   | 4.12          | ⬤⬤         |  70m | ☑   |
| 4.16 | Build `SummarySection` + `MaintainabilitySection` + `BestPracticesSection`             | 4.12          | ⬤⬤         |  55m | ☑   |
| 4.17 | Build `ComplexitySection` with graceful `"N/A"` handling                               | 4.12          | ⬤⬤         |  45m | ☑   |
| 4.18 | Build `RefactorSection`, `CommitMessageSection`, `PrDescriptionSection` + copy buttons | 4.14          | ⬤⬤         |  70m | ☑   |
| 4.19 | Build `ReportView` composing all 13 sections                                           | 4.15–4.18     | ⬤⬤         |  60m | ☑   |
| 4.20 | Build `ReviewSkeleton` with staged loading copy                                        | 4.19          | ⬤⬤         |  50m | ☑   |
| 4.21 | Wire the review page; add toasts and error/retry states                                | 4.19, 4.20    | ⬤⬤         |  70m | ☑   |

**Definition of Done**
☑ Paste/upload → structured report ☑ Over-limit blocked **before** the request ☑ Skeletons during the wait ☑ Failures offer Retry ☑ Works at 375px ☑ Monaco lazy-loads

---

## M5 — Dashboard, History, Search & Favorites

**Goal:** full, safe lifecycle control over a user's reviews.

| ID   | Task                                                             | Depends   | Difficulty | Est. | ☑   |
| ---- | ---------------------------------------------------------------- | --------- | ---------- | ---: | --- |
| 5.1  | Add cursor pagination to `review.repository`                     | 4.21      | ⬤⬤⬤        |  70m | ☑   |
| 5.2  | Add `pg_trgm` extension + GIN index on `title`; migrate          | 5.1       | ⬤⬤         |  45m | ☑   |
| 5.3  | Add search + language/favorite/status filters to the repository  | 5.2       | ⬤⬤         |  60m | ☑   |
| 5.4  | Extend `review.service` with `list`, `update`, `remove`          | 5.3       | ⬤⬤         |  60m | ☑   |
| 5.5  | Build `GET /api/reviews` with query-param validation             | 5.4       | ⬤⬤         |  60m | ☑   |
| 5.6  | Build `PATCH /api/reviews/[id]` (rename, favorite)               | 5.4       | ⬤⬤         |  45m | ☑   |
| 5.7  | Build `DELETE /api/reviews/[id]`                                 | 5.4       | ⬤          |  35m | ☑   |
| 5.8  | Add `retry` to the service; build `POST /api/reviews/[id]/retry` | 5.4, 3.14 | ⬤⬤         |  60m | ☑   |
| 5.9  | Build `useReviews` infinite query                                | 5.5, 4.8  | ⬤⬤         |  55m | ☑   |
| 5.10 | Build `ReviewCard`                                               | 4.13      | ⬤⬤         |  60m | ☑   |
| 5.11 | Build `ReviewList` + `LoadMoreButton`                            | 5.9, 5.10 | ⬤⬤         |  55m | ☑   |
| 5.12 | Build `SearchInput` with 300ms debounce                          | 5.9       | ⬤⬤         |  45m | ☑   |
| 5.13 | Build language + favorites filters                               | 5.9, 4.4  | ⬤⬤         |  50m | ☑   |
| 5.14 | Build `useToggleFavorite` — optimistic **with rollback**         | 5.6, 4.8  | ⬤⬤⬤        |  70m | ☑   |
| 5.15 | Build `ConfirmDialog` shared component                           | 0.6       | ⬤          |  35m | ☑   |
| 5.16 | Build `useDeleteReview` — optimistic + undo toast                | 5.7, 5.15 | ⬤⬤⬤        |  70m | ☑   |
| 5.17 | Build `UsageMeter` widget                                        | 3.18, 4.9 | ⬤⬤         |  45m | ☑   |
| 5.18 | Assemble the dashboard page with empty/loading/error states      | 5.11–5.17 | ⬤⬤         |  70m | ☑   |
| 5.19 | **Security test:** ownership isolation across all review routes  | 5.5–5.8   | ⬤⬤⬤        |  70m | ☑   |

> ⚠️ **Task 5.19 is not optional.** Verify user B cannot read, patch, delete, or retry user A's review — and that the response is `404`, not `403`. Ownership must be enforced in the `where` clause, never by fetch-then-compare.

**Definition of Done**
☑ Paginated, newest-first ☑ Search works ☑ Favorite rolls back visibly on failure ☑ Delete confirms + undo ☑ Cross-user access returns 404 ☑ Retry works

---

## M6 — Export

**Goal:** reviews leave the app as shareable artifacts.

| ID   | Task                                                            | Depends  | Difficulty | Est. | ☑   |
| ---- | --------------------------------------------------------------- | -------- | ---------- | ---: | --- |
| 6.1  | Build `toMarkdown()` — pure, all 13 sections                    | 5.18     | ⬤⬤         |  80m | ☑   |
| 6.2  | Handle `FAILED` reviews in `toMarkdown()` (metadata only)       | 6.1      | ⬤          |  25m | ☑   |
| 6.3  | Escape backticks and fenced blocks in AI output                 | 6.1      | ⬤⬤         |  40m | ☑   |
| 6.4  | Build `export.service.ts`                                       | 6.1      | ⬤          |  25m | ☑   |
| 6.5  | Build `GET /api/reviews/[id]/export` with `Content-Disposition` | 6.4      | ⬤⬤         |  45m | ☑   |
| 6.6  | Build `CopyMarkdownButton`                                      | 6.1      | ⬤          |  30m | ☑   |
| 6.7  | Install `@react-pdf/renderer`; build `PdfDocument` layout       | 5.18     | ⬤⬤⬤        |  90m | ☑   |
| 6.8  | Handle code-block wrapping and pagination in the PDF            | 6.7      | ⬤⬤⬤        |  70m | ☑   |
| 6.9  | Lazy-load the PDF module via dynamic import; verify the bundle  | 6.7      | ⬤⬤         |  45m | ☑   |
| 6.10 | Build `ExportMenu`; wire into the review page and cards         | 6.5, 6.9 | ⬤⬤         |  50m | ☑   |
| 6.11 | Snapshot test Markdown; verify PDF for min/max payloads         | 6.1, 6.8 | ⬤⬤         |  50m | ☑   |

> ⚠️ **Do not reuse Tailwind components inside `@react-pdf/renderer`.** It supports only a CSS subset. Build a small dedicated document layout.

**Definition of Done**
☑ Markdown opens correctly anywhere ☑ PDF paginates without clipping code ☑ PDF lib absent from the initial bundle ☑ `FAILED` reviews export cleanly

---

## M7 — Settings, Polish & Portfolio Hardening

**Goal:** from "working" to "hire this person".

| ID   | Task                                                                    | Depends    | Difficulty | Est. | ☑   |
| ---- | ----------------------------------------------------------------------- | ---------- | ---------- | ---: | --- |
| 7.1  | Build `preference.service.ts`                                           | 1.13, 3.10 | ⬤          |  35m | ☑   |
| 7.2  | Build `GET` + `PATCH /api/preferences`                                  | 7.1        | ⬤⬤         |  50m | ☑   |
| 7.3  | Build `usePreferences` hook                                             | 7.2, 4.9   | ⬤          |  30m | ☑   |
| 7.4  | Build `SettingsSection` shared component                                | 0.13       | ⬤          |  25m | ☑   |
| 7.5  | Build `ProfileSection` (name, email, avatar)                            | 7.4, 7.3   | ⬤⬤         |  50m | ◐   |
| 7.6  | Build `ThemeSection`                                                    | 7.4, 0.12  | ⬤          |  30m | ☑   |
| 7.7  | Build `AiPreferencesSection` (depth, default language, refactor toggle) | 7.4, 7.3   | ⬤⬤         |  55m | ☑   |
| 7.8  | **Wire `reviewDepth` + `includeRefactor` into prompt building**         | 7.7, 3.7   | ⬤⬤⬤        |  70m | ☑   |
| 7.9  | Build `UsagePanel` with reset time                                      | 7.4, 5.17  | ⬤⬤         |  40m | ☑   |
| 7.10 | Assemble the settings page                                              | 7.5–7.9    | ⬤⬤         |  50m | ☑   |
| 7.11 | Generate and commit demo review fixtures (schema-validated)             | 3.20       | ⬤⬤         |  55m | ☑   |
| 7.12 | Build the public `/demo/[slug]` page — no auth, no AI call              | 7.11, 4.19 | ⬤⬤         |  70m | ☑   |
| 7.13 | Link demos from the landing page                                        | 7.12, 0.14 | ⬤          |  25m | ☑   |
| 7.14 | Add `error.tsx` + `not-found.tsx` per route segment                     | 5.18       | ⬤⬤         |  55m | ☑   |
| 7.15 | Accessibility pass: focus traps, ARIA, contrast, keyboard paths         | 7.10, 7.14 | ⬤⬤⬤        |  90m | ☑   |
| 7.16 | Metadata + Open Graph tags + favicon                                    | 0.10       | ⬤          |  40m | ☑   |
| 7.17 | Create `.github/workflows/keepalive.yml` — daily `/api/health` ping     | 1.14       | ⬤⬤         |  40m | ☑   |
| 7.18 | Write `README.md` with architecture diagram and trade-offs              | all        | ⬤⬤         |  80m | ☑   |
| 7.19 | Full E2E: signup → review → favorite → search → export → delete         | 7.10, 6.10 | ⬤⬤⬤        |  80m | ☑   |

> ⚠️ **Task 7.17 protects the whole portfolio.** Supabase pauses free projects after 7 days idle — a recruiter clicking a dead link is the worst possible outcome. Note that GitHub disables scheduled workflows after 60 days of repo inactivity, so plan a monthly commit as backstop.
>
> ⚠️ **Task 7.8 matters more than it looks.** A settings page whose toggles do nothing is immediately visible to a technical reviewer. Preferences must genuinely change prompt behaviour.

**Definition of Done**
☑ Preferences persist **and change behaviour** ☑ Demo pages load logged-out ☑ Every route has loading/error/empty states ☑ Lighthouse a11y ≥95 ☑ Keepalive green ☑ README complete

---

## Cross-Milestone Verification

Run after **every** milestone — not just at the end.

| Check                   | Command / Action                                         |
| ----------------------- | -------------------------------------------------------- |
| ☑ Typecheck             | `npm run typecheck`                                      |
| ☑ Lint                  | `npm run lint`                                           |
| ☑ Unit tests            | `npm run test`                                           |
| ☑ Build                 | `npm run build`                                          |
| ☑ **Production verify** | Exercise the acceptance criteria on the **deployed URL** |
| ☑ Health                | `GET /api/health` returns ok against real Supabase       |
| ☑ Responsive            | Manual pass at 375px and 1440px                          |
| ☑ No secrets            | No key, token, or `sourceCode` in logs or client bundles |

---

## Risk Watchlist

The tasks most likely to overrun. Budget slack around them.

| Task                                          | Risk         | If it goes wrong                                           |
| --------------------------------------------- | ------------ | ---------------------------------------------------------- |
| **3.5** Strict-mode schema spike              | **Critical** | Everything downstream shifts. **Do this on day one of M3** |
| **3.6** System prompt + rubric                | High         | Output quality is the product. Expect several iterations   |
| **1.3** Pooled/direct URL split               | High         | Hanging migrations; cryptic prod errors                    |
| **2.6** Google OAuth redirect URIs            | High         | Silent callback failures; previews won't work              |
| **3.13/3.14** Service orchestration + retries | High         | The core critical path                                     |
| **5.14/5.16** Optimistic updates              | Medium       | Test the **failure** path, not just the happy one          |
| **4.2** Monaco integration                    | Medium       | SSR and bundle-size pitfalls                               |
| **6.7/6.8** PDF layout                        | Medium       | CSS subset surprises                                       |

---

## Progress

```
M0  ████████████████████  18/18   Foundation & deployment
M1  ████████████████████  14/14   Data layer
M2  ████████████████████  17/17   Authentication
M3  ████████████████████  22/22   AI review engine
M4  ████████████████████  21/21   Review workspace
M5  ████████████████████  19/19   Dashboard & history
M6  ████████████████████  11/11   Export
M7  ███████████████████░  18/19   Settings & polish
                          ─────
                    TOTAL 140/141
```

**7.5 is partially complete (◐).** The settings page shows the signed-in
email, but the display name and avatar cannot be edited. Deliberately left:
Better Auth owns the `user` table, and adding profile mutation would mean
either extending their schema or a second write path for the same record —
neither justified by the value.

## Delivered beyond the original plan

Work that was not in this checklist but shipped because testing revealed the
need:

- [x] Prompt hardening to v4 — access control, atomicity, score caps, and
      refactor self-checks, after a review missed that any user could transfer
      from any account
- [x] Provider error logging, which made an opaque 503 diagnosable
- [x] Retry classification — Groq 400 `json_validate_failed` is a schema
      failure, not an outage, and now triggers the repair path
- [x] Inline rename on review cards
- [x] Copy and download actions on review output
- [x] `CHECKPOINT.md` for resuming from a cold start
- [x] Known-limitations documentation with compiled and executed evidence
