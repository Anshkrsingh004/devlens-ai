# CLAUDE.md — DevLens AI

> Permanent repository memory. Read this before writing any code in this repo.
> If a rule here conflicts with a general habit or a tutorial, **this file wins**.

---

## 1. What This Project Is

**DevLens AI** — an AI-powered code review tool. A user pastes or uploads source code, selects a language, and receives a structured 13-section engineering report. Reviews are persisted, searchable, favoritable, and exportable.

The AI behaves like a **senior engineer producing a report**, never like a chatbot.

**Stack:** Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn/ui · Monaco · React Hook Form · Zod · TanStack Query · Prisma 7 · PostgreSQL (Supabase) · Better Auth · Groq · Vercel.

**Reference documents:** `IMPLEMENTATION_ROADMAP.md` · `PROJECT_STRUCTURE.md` · `DATABASE.md` · `API.md` · `TASKS.md`

---

## 2. Non-Negotiable Constraints

Violating any of these breaks the project's core premises.

| #   | Constraint                                                                                            | Why                                   |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| C1  | **₹0 cost.** No paid service, ever.                                                                   | Hard project requirement              |
| C2  | **No Redis, Docker, Kubernetes, queues, vector DBs, LangChain, or any cloud beyond Vercel/Supabase.** | Cost and complexity                   |
| C3  | **Groq free tier: 30 RPM · 1,000 RPD · 8,000 TPM · 200,000 TPD.**                                     | The real product ceiling              |
| C4  | **Source code input capped at 8,000 characters.**                                                     | Fits the token budget                 |
| C5  | **Only `openai/gpt-oss-120b` / `20b` support strict structured outputs.**                             | Model choice is forced                |
| C6  | **Structured outputs cannot stream.**                                                                 | No streaming UX anywhere              |
| C7  | **Never call the real Groq API from tests or CI.**                                                    | Burns the daily quota; makes CI flaky |
| C8  | **Never use deprecated Groq Llama models** (`llama-3.3-70b`, `llama-3.1-8b`, retired 2026-08-16).     | They will stop working                |

---

## 3. Architecture Rules

### 3.1 The four layers

```
Presentation (app/, features/*/components)
      ↓ fetch
Transport    (app/api/**/route.ts)        ← guard, validate, delegate. NO logic
      ↓
Domain       (server/services/*)          ← ALL business logic
      ↓
Data         (server/repositories/*, server/ai/*)
```

**Dependencies point inward. Never outward.**

### 3.2 Absolute rules

| Rule   | Meaning                                                                        |
| ------ | ------------------------------------------------------------------------------ |
| **R1** | UI never imports Prisma or the Groq client. Ever.                              |
| **R2** | Business logic lives **only** in `server/services/`.                           |
| **R3** | Database access lives **only** in `server/repositories/`.                      |
| **R4** | Route handlers contain no logic — guard, parse, delegate, return.              |
| **R5** | Services are framework-agnostic — never accept `Request` or return `Response`. |
| **R6** | `process.env` is read **only** in `lib/env.ts`.                                |
| **R7** | Every file in `server/` starts with `import 'server-only'`.                    |
| **R8** | Features never import other features. Promote to `components/shared/` instead. |

### 3.3 Route Handlers, not Server Actions

**Use route handlers exclusively.** Supporting both would create two mutation paths and two error-handling styles for identical operations — duplicated business logic by construction. If a Server Action seems necessary, add a route handler and call it through TanStack Query.

---

## 4. Folder Conventions

| Path                   | Contains                                      | Never contains                              |
| ---------------------- | --------------------------------------------- | ------------------------------------------- |
| `app/`                 | Routes, layouts, route handlers               | Business logic                              |
| `features/<name>/`     | Components, hooks, schemas for one capability | Server-only code                            |
| `server/services/`     | Business logic                                | Prisma calls, HTTP types                    |
| `server/repositories/` | Prisma queries                                | Business rules                              |
| `server/ai/`           | Groq client, prompts, token budget            | Persistence                                 |
| `components/ui/`       | shadcn primitives                             | **Hand edits — regeneration destroys them** |
| `components/shared/`   | Cross-feature composites                      | Data fetching                               |
| `lib/`                 | Framework-agnostic utilities                  | Domain knowledge                            |
| `config/`              | Static constants                              | Logic                                       |

**Create folders only when a milestone needs them.** Empty scaffolding rots and misleads.

**The one sanctioned exception to layer isolation:** `features/review/schemas/` may be imported by `server/`. Those files are pure Zod with no server dependencies, and sharing them guarantees client and server validate identically.

---

## 5. Naming Rules

| Kind         | Convention                     | Example                  |
| ------------ | ------------------------------ | ------------------------ |
| Components   | `PascalCase.tsx`               | `ReviewCard.tsx`         |
| Hooks        | `use` + `camelCase.ts`         | `useCreateReview.ts`     |
| Services     | `*.service.ts`                 | `review.service.ts`      |
| Repositories | `*.repository.ts`              | `review.repository.ts`   |
| Schemas      | `*.schema.ts`                  | `review-input.schema.ts` |
| Utilities    | `kebab-case.ts`                | `token-budget.ts`        |
| Types        | `PascalCase`                   | `ReviewResult`           |
| Constants    | `SCREAMING_SNAKE_CASE`         | `MAX_SOURCE_CHARS`       |
| DB models    | `PascalCase` singular          | `Review`, `DailyUsage`   |
| Booleans     | `is` / `has` / `should` prefix | `isFavorite`             |

The `.service` / `.repository` suffixes are **mandatory**. They make layer violations visible in import statements during review, without opening the file.

---

## 6. Component Rules

1. **Server Components by default.** Add `"use client"` only for state, effects, or browser APIs — and push it as far down the tree as possible.
2. **Presentational components never fetch.** Data enters via props or a hook in the parent.
3. **Promote on the second consumer**, never in anticipation of one.
4. **Never hand-edit `components/ui/`.** Wrap it or pass `className`.
5. **Every list has three states**: loading, empty, error. No exceptions.
6. **Every interactive element is keyboard-reachable** with a visible focus ring.
7. **Heavy libraries are dynamically imported** — Monaco and `@react-pdf/renderer` use `dynamic(..., { ssr: false })`.
8. **One shape, one component.** The four `Finding[]` arrays share `FindingList`. Do not create near-duplicates.

**Props rules:** explicit interfaces, never `any`; no boolean-trap parameters — prefer a named union over `variant: boolean`.

---

## 7. API Rules

1. **Every response uses the envelope**: `{ data }` or `{ error: { code, message, details? } }`.
2. **Every protected handler calls `requireSession()`.** Middleware is _not_ a security boundary.
3. **Every handler is wrapped in `withApiHandler`.** No route writes its own try/catch.
4. **Every input is Zod-parsed** before reaching a service.
5. **Errors are thrown as `AppError`**, never returned as ad-hoc JSON.
6. **Ownership is enforced in the query**: `where: { id, userId }`. **Never fetch-then-compare** — that is how IDOR bugs are written.
7. **Unowned or missing resources return `404`, never `403`.** A `403` confirms the ID exists.
8. **Cursor pagination, never offset.**
9. **Authenticated responses set `Cache-Control: private, no-store`.**

**Reference implementation shape** (structure, not code to copy blindly):

```
export const POST = withApiHandler(async (req) => {
  const session = await requireSession();
  const dto = ReviewInputSchema.parse(await req.json());
  const review = await reviewService.create(session.user.id, dto);
  return { data: review };
});
```

If a handler grows beyond ~10 lines, logic has leaked in. Move it to the service.

---

## 8. Database Rules

1. **Better Auth owns `user`/`session`/`account`/`verification`.** Generated by CLI, never hand-edited, never extended — use `UserPreference` instead.
2. **Every user-scoped query filters by `userId`.**
3. **Migrations are committed and never edited after merge.**
4. **Never run `prisma db push` against production** — it bypasses migration history.
5. **Two connection strings are mandatory**: `DATABASE_URL` (pooler `:6543`, `?pgbouncer=true`) at runtime; `DIRECT_URL` (`:5432`) for the CLI. Getting this wrong causes hanging migrations and `prepared statement already exists` in production.
6. **`Review.result` stays JSON.** Written once, read whole, Zod-validated on both write and read.
7. **`overallScore` is deliberately denormalized** for sortable indexing. This is the _only_ sanctioned duplication.
8. **Additive migrations preferred**: add nullable → backfill → enforce.
9. **All indexes lead with `userId`** — every query is user-scoped.

---

## 9. AI Rules

1. **Model:** `openai/gpt-oss-120b`. Fallback `openai/gpt-oss-20b`. Never a Llama model.
2. **Always `temperature: 0.2`** — scores must be as stable as an LLM allows.
3. **Always `response_format: json_schema` with `strict: true`.**
4. **The schema is authored once in Zod**, derived via `z.toJSONSchema()`. Never hand-maintain a duplicate JSON Schema.
5. **No optional fields in `ReviewResultSchema`.** Strict mode requires all-required + `additionalProperties: false`. Use empty arrays and `"N/A"`.
6. **Always validate the model's output** with `ReviewResultSchema.parse()`. Trust nothing that comes back.
7. **Check the token budget before calling.** Never let a request 429 that could have been rejected locally.
8. **Persist the `Review` row before calling Groq**, so failures are never silently lost.
9. **Retry bounds:** Groq 429 → honour `retry-after`, retry **once**. Schema failure → **one** repair attempt. Then `FAILED`.
10. **Prompts live in `server/ai/system-prompt.ts`** as versioned constants — so prompt changes appear in git diffs.
11. **Complexity may be `"N/A"`.** For non-algorithmic code, a model will otherwise invent a plausible `O(n)`. Honesty beats fabrication.

---

## 10. Error Handling Rules

1. **One taxonomy**, defined in `lib/errors.ts` — see `API.md` §1.2.
2. **Throw `AppError`; never return ad-hoc error objects.**
3. **`withApiHandler` maps errors to status codes** in one place.
4. **Error messages are user-safe.** Never leak stack traces, SQL, or provider internals to the client.
5. **Log server-side**: `userId`, route, status, duration, `errorCode`, token counts.
6. **Never log**: `sourceCode`, session tokens, `GROQ_API_KEY`, password hashes, full Groq responses.
7. **Every route segment has `error.tsx`.** No white screens.
8. **Every failure the user can act on gets a Retry affordance.**

> Source code is user intellectual property. It belongs in the database the user controls and can delete — not in logs nobody can purge.

---

## 11. State Management Rules

1. **Server state → TanStack Query.** Client state → `useState`/`useReducer`. Never mix.
2. **All query keys come from `lib/query-keys.ts`.** Ad-hoc key strings are the #1 cause of cache bugs.
3. **Optimistic updates must implement rollback** — and the rollback path must be tested.
4. **No global state library.** If prop drilling exceeds three levels, use Context. Redux/Zustand are unnecessary here.
5. **Server Components fetch directly** via services — no TanStack Query needed there.

---

## 12. Validation Rules

1. **Zod everywhere** — every request body, query param, env var, and AI response.
2. **Input schemas are shared** between client and server so both validate identically.
3. **Zod answers "is this well-formed?"; services answer "is this allowed?"** Do not put authorization in a schema.
4. **Parse, don't validate** — use the parsed output, not the raw input.
5. **Limits come from `config/limits.ts`**, never inlined as magic numbers.

---

## 13. TypeScript Rules

1. **`strict: true`. No exceptions.**
2. **`any` is banned.** Use `unknown` plus narrowing. If you genuinely need an escape hatch, comment why.
3. **No non-null assertions (`!`)** — narrow properly.
4. **Infer types from Zod** with `z.infer<>` rather than declaring them twice.
5. **Prefer `type` for unions, `interface` for object contracts.**
6. **No `@ts-ignore`.** Use `@ts-expect-error` with an explanation if unavoidable.

---

## 14. UI Guidelines

| Aspect        | Rule                                                           |
| ------------- | -------------------------------------------------------------- |
| Styling       | Tailwind utilities only. No CSS modules, no styled-components  |
| Design tokens | CSS variables from shadcn. Never hardcode hex colours          |
| Spacing       | Tailwind scale only (`p-4`, not `p-[17px]`)                    |
| Dark mode     | Every component works in both themes. Always verify both       |
| Responsive    | Mobile-first. Must work at 375px                               |
| Icons         | `lucide-react` only                                            |
| Toasts        | Every mutation gives feedback — success or failure             |
| Loading       | Skeletons matching final layout. **Never a fake progress bar** |
| Empty states  | Always explain what to do next                                 |
| Focus         | Visible ring on every interactive element                      |
| Motion        | Respect `prefers-reduced-motion`                               |

**Accessibility is a requirement, not polish.** Semantic HTML, labelled controls, `aria-live` for async results, ≥4.5:1 contrast, full keyboard navigation. Target Lighthouse a11y ≥95.

---

## 15. Testing Rules

1. **Never call the real Groq API from tests.** Mock the client; use committed golden fixtures.
2. **Always test ownership isolation** — user B must not access user A's data.
3. **Test the failure path of optimistic updates**, not just the happy path.
4. **Unit-test pure functions first** — token estimator, prompt builder, `toMarkdown()`, quota arithmetic. Highest value per minute.
5. **Co-locate unit tests** beside source (`*.test.ts`); cross-module tests live in `tests/`.
6. **Do not snapshot whole pages** — brittle and low-signal.
7. **Do not chase coverage percentages** — they are gameable and measure the wrong thing.

---

## 16. Git Commit Convention

**Conventional Commits.** Format: `type(scope): subject`

| Type       | Use                              |
| ---------- | -------------------------------- |
| `feat`     | New user-facing capability       |
| `fix`      | Bug fix                          |
| `refactor` | Restructure, no behaviour change |
| `perf`     | Performance                      |
| `test`     | Tests only                       |
| `docs`     | Documentation                    |
| `chore`    | Tooling, deps, config            |
| `style`    | Formatting only                  |

**Scopes:** `auth`, `review`, `ai`, `db`, `ui`, `export`, `history`, `settings`, `api`, `config`

**Rules**

- Subject in imperative mood, lowercase, no trailing period, ≤72 chars.
- One logical change per commit.
- Body explains **why**, not what — the diff already shows what.
- Never commit `.env`, secrets, or `node_modules`.
- Never commit a knowingly broken build to `main`.

```
feat(ai): add token budget guard before groq call

Prevents 429s by rejecting oversized input locally rather than
discovering the limit at the provider. Groq free tier allows
8000 TPM; our budget reserves 4000 for output.
```

**Branches:** `feat/<short-name>`, `fix/<short-name>`. Never commit directly to `main`.

---

## 17. Definition of Done

A task is done only when **all** hold:

- [ ] Types check (`npm run typecheck`)
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Loading, empty, and error states exist
- [ ] Keyboard accessible with visible focus
- [ ] Works at 375px and in both themes
- [ ] No secrets or `sourceCode` in logs or the client bundle
- [ ] **Verified on the deployed URL**, not only locally

---

## 18. Anti-Patterns — Never Do These

| Anti-pattern                            | Why it is forbidden                                           |
| --------------------------------------- | ------------------------------------------------------------- |
| Prisma in a component                   | Couples UI to persistence; untestable                         |
| Business logic in `route.ts`            | Unreachable from scripts/tests; duplicated on the next caller |
| `process.env` outside `lib/env.ts`      | Unvalidated; fails in production instead of at build          |
| Editing `components/ui/`                | Silently destroyed on regeneration                            |
| Feature importing another feature       | Hidden dependency graph                                       |
| Ad-hoc query key strings                | Cache invalidation bugs                                       |
| Fetch-then-compare ownership            | **Causes IDOR vulnerabilities**                               |
| `any` to silence TypeScript             | Discards the guarantee the stack exists to provide            |
| Real Groq calls in CI                   | Burns the daily quota; flaky builds                           |
| Optional fields in `ReviewResultSchema` | Breaks strict structured outputs                              |
| Streaming the review response           | Incompatible with structured outputs                          |
| Logging `sourceCode`                    | Leaks user intellectual property                              |
| Creating folders "for later"            | Misleads readers about what exists                            |
| Fake progress bars                      | Dishonest UX; users notice                                    |
| Adding a library for a 20-line utility  | Bundle cost and supply-chain risk                             |

---

## 19. Future Expansion Rules

When adding features later, preserve these invariants:

1. **New entity?** Repository → service → route handler → hook → component. Never skip a layer.
2. **New AI capability?** Extend `ReviewResultSchema` first; the UI follows the contract, never the reverse.
3. **New external service?** It must have a free tier (C1) and be isolated behind an adapter in `server/`.
4. **New table?** Additive migration, `userId` FK with cascade, indexes leading with `userId`.
5. **Multi-tenancy?** Add `Organization` + `Membership`; add nullable `orgId` to `Review`. Do not retrofit `userId` semantics.
6. **Never break the response envelope** — the client depends on it universally.
7. **Any feature that increases token usage per review must be optional** and reflected in `UserPreference`. The 8,000 TPM ceiling is permanent on the free tier.
8. **Do not ship half-working features.** A missing feature is honest; a broken one is a liability — especially in a portfolio.

---

## 20. Known Limitations

Documented deliberately. Do not "fix" these by accident — they are considered trade-offs.

| Limitation                          | Reason                                                     |
| ----------------------------------- | ---------------------------------------------------------- |
| Single-file review only             | No cross-file context in the MVP                           |
| ~30 reviews/day account-wide        | Groq free tier ceiling                                     |
| Scores are not fully deterministic  | Inherent to LLMs; mitigated by rubric + `temperature: 0.2` |
| No streaming                        | Incompatible with strict structured outputs                |
| No PR diff review yet               | Deferred: more tokens, less signal at this budget          |
| Complexity may be `"N/A"`           | Honest for non-algorithmic code                            |
| Vercel Hobby forbids commercial use | Portfolio only until the tier changes                      |

**When asked to "improve" the app, check this list first.** Several apparent gaps are deliberate decisions with documented reasoning in `IMPLEMENTATION_ROADMAP.md` §9.
