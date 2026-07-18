# DevLens AI — Project Structure

> Every folder and every major file, with its purpose and the reasoning behind it.
> Companion to `IMPLEMENTATION_ROADMAP.md`.

---

## 1. Guiding Principles

Four rules determine where any given file belongs. When in doubt, apply them in order.

1. **Layer separation is physical, not conventional.** A client component _cannot_ import `server/` — the boundary is enforced by `import 'server-only'`, not by discipline.
2. **`features/` is organized by user-facing capability. `server/` is organized by technical layer.** This is deliberate: features are how humans think about the product; layers are how the machine executes it.
3. **Shared code earns its place.** Something moves into `components/shared/` or `lib/` only on its _second_ consumer, never in anticipation of one.
4. **Folders are created when a milestone needs them.** Empty scaffolding rots and misleads readers about what exists.

**The single most important structural decision:** business logic lives in `server/services/` and nowhere else. This is what physically prevents "UI mixed with business logic" — the most common form of debt in projects of this shape.

---

## 2. Top-Level Layout

```
AICodeReviewer/
├── .github/workflows/          # CI + Supabase keepalive cron
├── prisma/                     # Schema, migrations, seed data
├── public/                     # Static assets
├── src/                        # All application source
├── tests/                      # E2E + integration tests
├── CLAUDE.md                   # Permanent repo memory / coding standards
├── IMPLEMENTATION_ROADMAP.md   # Milestone plan
├── PROJECT_STRUCTURE.md        # This file
├── DATABASE.md                 # Schema reference
├── API.md                      # API contract
├── TASKS.md                     # Executable checklist
└── README.md                   # Public-facing overview
```

| Path                 | Purpose                                                       | Introduced |
| -------------------- | ------------------------------------------------------------- | ---------- |
| `.github/workflows/` | `ci.yml` gates PRs; `keepalive.yml` prevents Supabase pausing | M0 / M7    |
| `prisma/`            | Single source of truth for the database shape                 | M1         |
| `public/`            | Favicon, OG image, static assets                              | M0         |
| `src/`               | All source. Enables the `@/*` path alias                      | M0         |
| `tests/`             | Tests that span modules; unit tests sit beside their source   | M0         |

---

## 3. `src/` — Full Tree

```
src/
├── app/                                 # Next.js App Router — routing ONLY
│   ├── layout.tsx                       # Root layout: providers, fonts, metadata
│   ├── globals.css                      # Tailwind directives + CSS variables
│   ├── error.tsx                        # Global error boundary
│   ├── not-found.tsx                    # Global 404
│   │
│   ├── (marketing)/                     # Public route group
│   │   └── page.tsx                     # Landing page
│   │
│   ├── (auth)/                          # Unauthenticated route group
│   │   ├── layout.tsx                   # Centered card layout
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   │
│   ├── (dashboard)/                     # PROTECTED route group
│   │   ├── layout.tsx                   # Session guard + app shell
│   │   ├── dashboard/page.tsx           # Review history
│   │   ├── review/new/page.tsx          # Review workspace
│   │   ├── review/[id]/page.tsx         # Single review report
│   │   └── settings/page.tsx
│   │
│   ├── demo/[slug]/page.tsx             # PUBLIC sample reviews — no auth, no AI
│   │
│   └── api/                             # Route handlers — transport ONLY
│       ├── auth/[...all]/route.ts
│       ├── reviews/route.ts
│       ├── reviews/[id]/route.ts
│       ├── reviews/[id]/retry/route.ts
│       ├── reviews/[id]/export/route.ts
│       ├── preferences/route.ts
│       ├── usage/route.ts
│       └── health/route.ts
│
├── features/                            # Vertical slices by capability
│   ├── auth/
│   │   ├── components/                  # SignInForm, SignUpForm, GoogleButton, UserMenu
│   │   ├── hooks/                       # useSession
│   │   └── schemas/                     # sign-in.schema, sign-up.schema
│   │
│   ├── review/
│   │   ├── components/
│   │   │   ├── CodeEditor.tsx           # Monaco wrapper (dynamic, ssr:false)
│   │   │   ├── LanguageSelect.tsx
│   │   │   ├── FileDropzone.tsx
│   │   │   ├── TokenMeter.tsx
│   │   │   ├── ReviewForm.tsx
│   │   │   ├── ReportView.tsx           # Composes all 13 sections
│   │   │   ├── ScoreGauge.tsx
│   │   │   ├── ReviewSkeleton.tsx
│   │   │   └── sections/                # One component per report section
│   │   ├── hooks/                       # useCreateReview, useReview
│   │   ├── schemas/                     # review-input, review-result  ← SHARED with server
│   │   └── lib/                         # score-color, section-meta
│   │
│   ├── history/
│   │   ├── components/                  # ReviewList, ReviewCard, SearchInput, filters
│   │   └── hooks/                       # useReviews, useDeleteReview, useToggleFavorite
│   │
│   ├── export/
│   │   ├── lib/                         # to-markdown.ts, to-pdf.tsx
│   │   └── components/                  # ExportMenu
│   │
│   └── settings/
│       ├── components/                  # SettingsForm, UsagePanel
│       └── hooks/                       # usePreferences
│
├── server/                              # SERVER-ONLY. Never imported by client code
│   ├── auth/
│   │   ├── auth.ts                      # Better Auth configuration
│   │   └── guards.ts                    # requireSession, getOptionalSession
│   ├── services/                        # ALL business logic
│   │   ├── review.service.ts
│   │   ├── quota.service.ts
│   │   ├── export.service.ts
│   │   └── preference.service.ts
│   ├── repositories/                    # ALL database access
│   │   ├── review.repository.ts
│   │   ├── usage.repository.ts
│   │   └── preference.repository.ts
│   └── ai/
│       ├── groq-client.ts               # Thin HTTP wrapper, zero logic
│       ├── prompt-builder.ts            # Pure function
│       ├── token-budget.ts              # Pure function
│       └── system-prompt.ts             # Versioned prompt constant
│
├── components/
│   ├── ui/                              # shadcn/ui primitives — DO NOT hand-edit
│   └── shared/                          # Cross-feature composites
│       ├── AppShell.tsx
│       ├── PageHeader.tsx
│       ├── EmptyState.tsx
│       ├── ConfirmDialog.tsx
│       ├── CodeBlock.tsx
│       ├── ErrorBoundary.tsx
│       └── ThemeToggle.tsx
│
├── lib/                                 # Framework-agnostic cross-cutting utilities
│   ├── env.ts                           # Zod-validated env. The ONLY process.env reader
│   ├── db.ts                            # Prisma singleton
│   ├── errors.ts                        # AppError + error taxonomy
│   ├── api-handler.ts                   # withApiHandler wrapper
│   ├── api-client.ts                    # Typed fetch for the client
│   ├── query-keys.ts                    # TanStack Query key factory
│   └── utils.ts                         # cn() and small helpers
│
├── config/                              # Static configuration, no logic
│   ├── languages.ts                     # The 5 supported languages
│   ├── limits.ts                        # MAX_SOURCE_CHARS, quotas, token budget
│   └── site.ts                          # Name, description, URLs
│
├── types/                               # Ambient and shared types
│   └── index.ts
│
└── middleware.ts                        # Optimistic auth redirect. NOT a security boundary
```

---

## 4. Folder Purposes

### `src/app/` — Routing only

Holds routes, layouts, and route handlers. **Contains no business logic.** Pages fetch via server components or hooks and delegate everything else.

| Path           | Purpose                         | Why it exists                                                |
| -------------- | ------------------------------- | ------------------------------------------------------------ |
| `layout.tsx`   | Root providers, fonts, metadata | Single mount point for global context                        |
| `(marketing)/` | Public landing                  | Route groups apply layouts without affecting URLs            |
| `(auth)/`      | Sign-in / sign-up               | Shares a centered layout distinct from the app shell         |
| `(dashboard)/` | All protected pages             | **One guard in one layout protects every child route**       |
| `demo/[slug]/` | Public sample reviews           | Lets a recruiter see output with no signup and no quota cost |
| `api/`         | Route handlers                  | Transport layer: guard, validate, delegate, map errors       |

> **Why route groups?** `(dashboard)` places the session guard in exactly one `layout.tsx` covering every protected page. Adding a new private page requires zero additional auth code — the most common place auth checks get forgotten.

### `src/features/` — Vertical slices

Each feature owns its components, hooks, and schemas. A feature may import from `components/`, `lib/`, and `config/` — but **never from another feature**. Cross-feature sharing means the code has earned promotion to `components/shared/`.

| Feature     | Owns                                            | Milestone |
| ----------- | ----------------------------------------------- | --------- |
| `auth/`     | Sign-in/up forms, session hook                  | M2        |
| `review/`   | Editor, report rendering, **the result schema** | M3–M4     |
| `history/`  | Dashboard list, search, filters                 | M5        |
| `export/`   | Markdown + PDF serialization                    | M6        |
| `settings/` | Preferences, usage panel                        | M7        |

> **Why `review/schemas/` is shared with the server.** `ReviewResultSchema` and `ReviewInputSchema` are imported by both client and server. They contain no server-only imports, so this is safe — and it guarantees that client and server validate against _literally the same rules_. Validation drift between client and server is a classic bug class; this design makes it impossible.

### `src/server/` — Server-only

Every file begins with `import 'server-only'`. Importing any of this from a client component is a **build-time error**, not a runtime surprise.

| Folder          | Responsibility                        | Must not                                             |
| --------------- | ------------------------------------- | ---------------------------------------------------- |
| `auth/`         | Better Auth config + session guards   | Contain UI                                           |
| `services/`     | **All business logic**                | Import `Request`/`Response` or touch Prisma directly |
| `repositories/` | **All database access**               | Contain business rules                               |
| `ai/`           | Groq client, prompts, token budgeting | Contain persistence logic                            |

> **Why services and repositories are separate.** The repository answers _"how do I fetch this row?"_; the service answers _"is this user allowed, and what should happen?"_. Merging them means swapping the ORM would require rewriting business rules — and it makes services impossible to unit-test without a database.

### `src/components/`

- **`ui/`** — shadcn/ui primitives. Generated by the CLI and treated as vendor code. **Never hand-edited**; regenerating would silently discard changes. Customize via `className` or a wrapper.
- **`shared/`** — Composites used by two or more features. Presentational only; never fetches data.

### `src/lib/`

Framework-agnostic utilities with no domain knowledge.

| File             | Purpose               | Why it matters                                                               |
| ---------------- | --------------------- | ---------------------------------------------------------------------------- |
| `env.ts`         | Zod-validated env     | **Only file reading `process.env`.** Fails at boot, not at 3am in production |
| `db.ts`          | Prisma singleton      | Prevents connection exhaustion; global cache survives HMR                    |
| `errors.ts`      | `AppError` + taxonomy | One vocabulary for failure across every layer                                |
| `api-handler.ts` | `withApiHandler`      | Maps thrown errors → HTTP status. **No route writes try/catch**              |
| `api-client.ts`  | Typed fetch           | Unwraps the response envelope; throws typed errors                           |
| `query-keys.ts`  | Query key factory     | **Ad-hoc key strings are the #1 cause of cache bugs**                        |

### `src/config/`

Static values with no logic. Changing a limit means editing one file.

| File           | Contains                                                        |
| -------------- | --------------------------------------------------------------- |
| `languages.ts` | The five supported languages: label, Monaco id, file extensions |
| `limits.ts`    | `MAX_SOURCE_CHARS`, daily quota, token budget constants         |
| `site.ts`      | Name, description, canonical URL, OG defaults                   |

---

## 5. Component Catalogue

For every significant component: why it exists, what depends on it, and whether it is reusable.

### Reusable — shared across features

| Component       | Why it exists              | Why it is needed                                 | Depended on by                         | Reusable |
| --------------- | -------------------------- | ------------------------------------------------ | -------------------------------------- | -------- |
| `AppShell`      | One page frame             | Consistent header/nav/footer everywhere          | Every protected page                   | **Yes**  |
| `PageHeader`    | Uniform titling + actions  | Prevents each page inventing its own header      | Dashboard, settings, review            | **Yes**  |
| `EmptyState`    | Consistent "nothing here"  | Empty states appear in 4+ places                 | Dashboard, search, workspace           | **Yes**  |
| `ConfirmDialog` | Guard destructive actions  | Deletion must never be one click                 | Delete review; future destructive ops  | **Yes**  |
| `CodeBlock`     | Read-only highlighted code | Needed wherever code is displayed but not edited | Refactor section, demo, export preview | **Yes**  |
| `ErrorBoundary` | Contain render failures    | No route may show a white screen                 | Every route segment                    | **Yes**  |
| `ThemeToggle`   | Theme switching            | Referenced from two places                       | Header, settings                       | **Yes**  |

### Feature-specific — intentionally not reusable

| Component        | Why it exists                           | Depended on by               | Reusable                    |
| ---------------- | --------------------------------------- | ---------------------------- | --------------------------- |
| `CodeEditor`     | Monaco wrapper, dynamically imported    | `ReviewForm`                 | No — one use                |
| `LanguageSelect` | Language choice from `config/languages` | `ReviewForm`, filters        | Partly                      |
| `FileDropzone`   | Upload with cap + language inference    | `ReviewForm`                 | No                          |
| `TokenMeter`     | Makes an invisible constraint visible   | `ReviewForm`, settings       | Partly                      |
| `ScoreGauge`     | Large score visualization               | `ReportView`                 | No — card uses `ScoreBadge` |
| `ScoreBadge`     | Compact score with colour thresholds    | `ReviewCard`, `ReportView`   | **Yes**                     |
| `ReviewCard`     | Summary representation                  | Dashboard, search, favorites | **Yes**                     |
| `SearchInput`    | Debounce written once                   | Dashboard                    | Partly                      |
| `UsageMeter`     | Surfaces the free-tier ceiling          | Dashboard, settings          | **Yes**                     |

### Report sections

| Component                | Renders                                         | Reusable                             |
| ------------------------ | ----------------------------------------------- | ------------------------------------ |
| `SectionCard`            | Uniform frame: icon, title, body                | **Yes — all 13 sections**            |
| `SummarySection`         | Prose summary                                   | No                                   |
| **`FindingList`**        | **Bugs · Security · Performance · Code Smells** | **Yes — one component, four usages** |
| `ComplexitySection`      | Time + space complexity, `"N/A"`-aware          | No                                   |
| `MaintainabilitySection` | Maintainability suggestions                     | No                                   |
| `BestPracticesSection`   | Best-practice recommendations                   | No                                   |
| `RefactorSection`        | Refactored code / patches                       | No                                   |
| `CommitMessageSection`   | Suggested commit message + copy                 | No                                   |
| `PrDescriptionSection`   | Suggested PR description + copy                 | No                                   |

> **The `FindingList` decision.** Bugs, security issues, performance problems, and code smells are structurally identical — each is a list of `{ severity, title, description, line, suggestion }`. Modelling them as one shape and rendering them with one component removes four near-duplicate components. This is the clearest example of "prefer reusable abstractions" in the codebase, and it is the first thing an interviewer will notice reading `ReportView`.

---

## 6. Key File Reference

| File                                       | Purpose               | Why it is critical                                                                              |
| ------------------------------------------ | --------------------- | ----------------------------------------------------------------------------------------------- |
| `lib/env.ts`                               | Validated environment | Misconfiguration fails at build, not in production                                              |
| `lib/db.ts`                                | Prisma singleton      | Serverless connection safety                                                                    |
| `lib/errors.ts`                            | Error taxonomy        | Every layer speaks one failure vocabulary                                                       |
| `lib/api-handler.ts`                       | Route wrapper         | Centralized error handling; keeps routes 5 lines long                                           |
| `lib/query-keys.ts`                        | Cache key factory     | Prevents the most common TanStack Query bug class                                               |
| `features/review/schemas/review-result.ts` | **The AI contract**   | **The single most important file in the repo** — UI, export, tests, and Groq all derive from it |
| `server/ai/system-prompt.ts`               | Versioned prompt      | Prompt changes are reviewable in git diffs                                                      |
| `server/ai/token-budget.ts`                | Budget guard          | Prevents 429s before they occur                                                                 |
| `server/auth/guards.ts`                    | `requireSession`      | **The real security boundary**                                                                  |
| `config/limits.ts`                         | All limits            | One place to tune free-tier constraints                                                         |
| `middleware.ts`                            | Optimistic redirect   | Explicitly _not_ a security boundary                                                            |

---

## 7. Import Rules

Enforced by ESLint `no-restricted-imports` and `server-only`.

```
app/          → may import: features, components, lib, config, server
features/     → may import: components, lib, config          ✗ NOT server, NOT other features
components/   → may import: lib, config                      ✗ NOT features, NOT server
server/       → may import: lib, config, shared schemas      ✗ NOT components, NOT features
lib/          → may import: config                           ✗ NOT features, NOT server
config/       → imports nothing
```

**The one deliberate exception:** `features/review/schemas/` is importable by `server/`. Those files are pure Zod with no server dependencies, and sharing them is what guarantees client and server validate identically.

**Why enforce this in ESLint rather than by convention?** Conventions decay under deadline pressure. A lint error does not.

---

## 8. Naming Conventions

| Kind             | Convention                       | Example                  |
| ---------------- | -------------------------------- | ------------------------ |
| React components | `PascalCase.tsx`                 | `ReviewCard.tsx`         |
| Hooks            | `camelCase.ts`, `use` prefix     | `useCreateReview.ts`     |
| Services         | `*.service.ts`                   | `review.service.ts`      |
| Repositories     | `*.repository.ts`                | `review.repository.ts`   |
| Schemas          | `*.schema.ts`                    | `review-input.schema.ts` |
| Utilities        | `kebab-case.ts`                  | `token-budget.ts`        |
| Route handlers   | `route.ts` (Next.js requirement) | —                        |
| Types/interfaces | `PascalCase`                     | `ReviewResult`           |
| Constants        | `SCREAMING_SNAKE_CASE`           | `MAX_SOURCE_CHARS`       |
| DB models        | `PascalCase` singular            | `Review`, `DailyUsage`   |
| DB enums         | `SCREAMING_SNAKE_CASE` values    | `Language.TYPESCRIPT`    |

**Suffix rule:** `.service` and `.repository` suffixes are mandatory, not decorative. They make layer violations visible in import statements during code review — you can spot a route importing a `.repository` directly without opening the file.

---

## 9. Where Does This Code Go?

A decision table for the recurring question.

| I am writing…                              | It goes in               | Because                                 |
| ------------------------------------------ | ------------------------ | --------------------------------------- |
| A Prisma query                             | `server/repositories/`   | All DB access is isolated               |
| A business rule or validation-beyond-shape | `server/services/`       | All logic lives in one layer            |
| A Zod DTO shared by client and server      | `features/*/schemas/`    | Shared contract, no server deps         |
| A Groq prompt                              | `server/ai/`             | AI concerns are isolated and swappable  |
| A component used by one feature            | `features/*/components/` | Keep it near its consumer               |
| A component used by two+ features          | `components/shared/`     | Earned promotion                        |
| A shadcn primitive                         | `components/ui/`         | Vendor code — never hand-edit           |
| A tunable number                           | `config/limits.ts`       | Constants are configuration, not code   |
| A pure helper with no domain knowledge     | `lib/utils.ts`           | Framework-agnostic                      |
| An env var read                            | `lib/env.ts`             | The only legal `process.env` reader     |
| A data-fetching hook                       | `features/*/hooks/`      | Co-located with its feature             |
| A route handler                            | `app/api/**/route.ts`    | Transport only — guard, parse, delegate |

---

## 10. Structural Anti-Patterns

Explicitly forbidden. Each has caused real debt in projects of this shape.

| Anti-pattern                       | Why it is forbidden                                               | Do instead                                    |
| ---------------------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| Prisma called from a component     | Couples UI to persistence; breaks testability                     | Component → hook → API → service → repository |
| Business logic in `route.ts`       | Unreachable from scripts and tests; duplicated on the next caller | Delegate to a service                         |
| `process.env` outside `lib/env.ts` | Unvalidated; fails at runtime instead of build                    | Import from `lib/env.ts`                      |
| Editing `components/ui/`           | Silently lost on regeneration                                     | Wrap it or pass `className`                   |
| Feature importing another feature  | Creates a hidden dependency graph                                 | Promote to `components/shared/`               |
| Ad-hoc query key strings           | Cache invalidation bugs                                           | Use `lib/query-keys.ts`                       |
| Fetch-then-compare ownership       | **Causes IDOR vulnerabilities**                                   | Scope in the `where` clause                   |
| `any` to silence TypeScript        | Discards the guarantee the stack exists to provide                | Model the type or use `unknown` + narrowing   |
| Creating folders "for later"       | Misleads readers about what exists                                | Create at the milestone that needs it         |
