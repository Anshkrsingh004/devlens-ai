# Checkpoint — 2026-07-20

State of the project after M7. Written so work can resume from a cold start
without re-deriving anything.

**Live:** <https://devlens-ai-tau.vercel.app> · **Repo:** `Anshkrsingh004/devlens-ai`

---

## Status

All seven milestones complete, deployed and verified in production.
CI green, 60 tests passing.

| Milestone                  | State                            |
| -------------------------- | -------------------------------- |
| M0 Foundation & deployment | done                             |
| M1 Data layer              | done                             |
| M2 Authentication          | done, Google + email             |
| M3 AI review engine        | done, prompt at v4               |
| M4 Review workspace        | done, Monaco + 13 sections       |
| M5 Dashboard & history     | done, search/favorites/detail    |
| M6 Export                  | done, Markdown + client-side PDF |
| M7 Settings & polish       | done, 0 serious a11y violations  |

---

## What remains

Finishing gaps, not architectural work. Roughly 30 minutes.

### 1. Retry is unreachable from the UI

`POST /api/reviews/[id]/retry` exists, is tested, and enforces ownership —
but no component calls it. A review that fails sits in the dashboard marked
"Failed" with no way to re-run it. This is the same class of mistake as
`/review/new` having no link in M4: a working feature nobody can reach.

Needs a `useRetryReview` mutation (mirror `useToggleFavorite` in
`features/history/hooks/useReviews.ts`) and a button on `ReviewCard` when
`status === "FAILED"`, plus one on the review detail page.

Note: a retry consumes quota, so the button should say so.

### 2. Renaming a review is not wired up

`PATCH /api/reviews/[id]` accepts `title`, validated and tested. Nothing
uses it, so every review keeps its auto-derived title ("import sqlite3",
"class Buffer {"), which reads poorly once there are twenty.

### 3. TASKS.md checkboxes are all unticked

Cosmetic, but a reviewer opening it sees 0/141 on a finished project.

### 4. Profile editing (optional)

Settings shows the signed-in email but the display name cannot be changed.

---

## Things that will bite you if forgotten

**Layer rules are enforced by ESLint, not convention.** They have caught six
genuine mistakes. When a boundary error appears, fix the design — do not
weaken the rule. Precedents: `ScoreBadge` was promoted to `components/shared`
on its second consumer; `SCORE_MIN`/`SCORE_MAX` moved to `config` because
shared components may import config but never features.

**`npm run verify` matches CI exactly.** Run it before pushing.

**Test data cleanup.** Integration testing creates real users. Purge with:

```
echo 'DELETE FROM "user" WHERE email LIKE '"'"'prefix+%'"'"';' | npx prisma db execute --stdin
```

**Groq quota.** ~2 reviews/minute, ~45/day account-wide. Resets midnight UTC.
Never call the real API from tests.

**Demo fixtures** live in `src/features/demo/data/demos.json` and are
validated against `reviewResultSchema` at module load. If the schema changes,
regenerate them or the build fails by design.

**Prompt is at v4.** Bump `SYSTEM_PROMPT_VERSION` on any material edit. Five
regression tests in `prompt-builder.test.ts` lock in the access-control,
atomicity, score-cap and refactor-quality sections — added after a review
missed that any user could transfer from any account.

---

## Known limitations (documented in README)

1. **Refactored code is a draft.** Three languages, three distinct defects —
   a missing `#include`, a dead bounds check, and a generator consumed before
   `sorted()`. Verified by compiling and running. This is a property of the
   technology; the refactor is never auto-applied.
2. **Scores drift** — the same file scored 32 and 45.
3. Single file per review · no streaming · 8,000-character cap.

---

## Verified in production

Auth (Google + email), reviews end to end, ownership isolation (cross-user
access returns 404 not 403), export, demo pages signed-out, and the daily
Supabase keepalive.
