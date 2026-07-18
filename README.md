# DevLens AI

**AI-Powered Code Review & Pull Request Assistant**

Paste or upload source code and receive a structured engineering review — bugs,
security issues, performance, complexity, a suggested refactor, and a ready-to-use
commit message. A scored report with fixed sections, not a chat transcript.

> **Status: Milestone M0 complete.** Foundation and deployment pipeline are in
> place. Authentication, the database, and the AI engine arrive in M1–M3.
> See [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md).

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
