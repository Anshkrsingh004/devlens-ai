# DevLens AI

**AI-Powered Code Review & Pull Request Assistant**

Paste or upload source code and receive a structured engineering review — bugs,
security issues, performance, complexity, a suggested refactor, and a ready-to-use
commit message. A scored report with fixed sections, not a chat transcript.

**Live:** <https://devlens-ai-tau.vercel.app>

> **Status: M0–M4 complete.** Auth, database, AI engine and the review
> workspace are live. History and export follow in M5–M6.
> See [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md).

---

## Known Limitations

Documented deliberately. Each is a measured trade-off, not an oversight.

### Refactored code is a draft, not verified output

**The findings are reliable. The suggested refactor is a starting point that
needs review before use.**

The model produces plausible, idiomatic-looking code that can contain subtle
bugs. Two consecutive reviews of the same C++ file produced two different
defects in the refactor:

| Attempt | Defect                                                                                                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Called `std::min`/`std::copy_n` without `#include <algorithm>`; and `data_.size() - 1` underflowed on an empty buffer, reintroducing the overflow it fixed                          |
| 2       | Bounds check compared against `std::string::capacity()` — which grows on assignment — so the truncation branch was **dead code** and the size limit silently stopped being enforced |

The second was confirmed by compiling and running it:

```
Buffer(10) initial capacity(): 15     <- not 10
after copyFrom, stored length: 66     <- should have truncated
Truncated to 10? NO -- limit not enforced
```

Prompt tuning reduced this but did not eliminate it — tightening the
instructions after attempt 1 produced a _different_ subtle bug rather than
none. This is a property of the technology, not a gap in the prompt.

**Treat a refactor as a code review comment: a suggestion from a colleague
who has not compiled it.**

### Scores are not deterministic

The same file scored **32** and **45** on separate runs. `temperature: 0.2`
and an anchored rubric narrow the spread, but an LLM cannot be made fully
repeatable. Findings stay stable across runs; severities and the overall score
drift.

### Other constraints

| Limitation                       | Reason                                      |
| -------------------------------- | ------------------------------------------- |
| Single file per review           | No cross-file context in the MVP            |
| ~2 reviews/minute, ~45/day       | Groq free tier: 8,000 TPM, 200,000 TPD      |
| Input capped at 8,000 characters | Fits the per-request token budget           |
| No streaming                     | Incompatible with strict structured outputs |
| Complexity may be `"N/A"`        | Honest for non-algorithmic code             |
| No PR diff review yet            | More tokens, less signal at this budget     |

---

## Getting Started

**Requirements:** Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open <http://localhost:3000>.

Every environment variable is validated at startup by `src/lib/env.ts`. If one
is missing or malformed the build fails with a message naming the variable —
this is intentional, and preferable to an `undefined` surfacing later.

## Scripts

| Command             | Purpose                                |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Development server (Turbopack)         |
| `npm run build`     | Production build                       |
| `npm run start`     | Serve the production build             |
| `npm run typecheck` | TypeScript, no emit                    |
| `npm run lint`      | ESLint, including layer-boundary rules |
| `npm run format`    | Format with Prettier                   |
| `npm run test`      | Unit and component tests (Vitest)      |
| `npm run test:e2e`  | End-to-end tests (Playwright)          |
| `npm run verify`    | Typecheck → lint → test → build        |

## Architecture

Four layers, with dependencies pointing inward. The UI never touches the
database or the AI provider directly.

```
Presentation  app/, features/*/components   React Server Components by default
      |
Transport     app/api/**/route.ts           Guard, validate, delegate. No logic
      |
Domain        server/services/*             All business logic
      |
Data          server/repositories/*, server/ai/*
```

These boundaries are enforced by ESLint (`no-restricted-imports`), not by
convention — a client component importing `@/server` fails CI. Conventions
decay under deadline pressure; a lint error does not.

## Documentation

| File                                                       | Contents                                  |
| ---------------------------------------------------------- | ----------------------------------------- |
| [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md) | Milestones, architecture decisions, risks |
| [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md)           | Every folder and file, with rationale     |
| [`DATABASE.md`](./DATABASE.md)                             | Schema, indexes, scaling                  |
| [`API.md`](./API.md)                                       | Route contracts and error taxonomy        |
| [`TASKS.md`](./TASKS.md)                                   | Implementation checklist                  |
| [`CLAUDE.md`](./CLAUDE.md)                                 | Coding standards and repository rules     |

## Tech Stack

Next.js 15 · TypeScript · TailwindCSS · shadcn/ui · Zod · Vitest · Playwright

Later milestones add Prisma, PostgreSQL (Supabase), Better Auth, Monaco Editor,
TanStack Query, and the Groq API.

Every dependency and service sits on a free tier. Total infrastructure
cost: **₹0**.
