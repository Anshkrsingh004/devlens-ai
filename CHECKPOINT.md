# Checkpoint — 2026-07-20

State of the project at the end of the M7 first half. Written so work can
resume from a cold start without re-deriving anything.

**Live:** <https://devlens-ai-tau.vercel.app> · **Repo:** `Anshkrsingh004/devlens-ai`

---

## Status

| Milestone                  | State                              |
| -------------------------- | ---------------------------------- |
| M0 Foundation & deployment | ✅ live                            |
| M1 Data layer              | ✅ verified in production          |
| M2 Authentication          | ✅ Google + email working          |
| M3 AI review engine        | ✅ real reviews in production      |
| M4 Review workspace        | ✅ Monaco + 13 rendered sections   |
| M5 Dashboard & history     | ✅ search, favorites, detail pages |
| M6 Export                  | ✅ Markdown + client-side PDF      |
| M7 Polish                  | 🟡 **half done** — see below       |

Latest commit: `5873d95`. CI green. 60 tests passing.

---

## What remains (M7 second half)

Neither item blocks the demo. Roughly 45 minutes total.

### 1. Settings page (~25 min)

Route `/settings` does not exist yet. Everything behind it already works:

- `preference.repository.ts` — `findOrCreate`, `update` (done, tested)
- `UserPreference` table — `theme`, `defaultLanguage`, `reviewDepth`,
  `includeRefactor` (migrated, defaults verified)
- `buildSystemPrompt(depth)` and `buildUserPrompt({ includeRefactor })`
  already consume those values

Still needed:

- `GET`/`PATCH /api/preferences` route (`API.md` §5 has the contract)
- `preference.service.ts`
- `usePreferences` hook + `SettingsForm`
- A link to `/settings` in `UserMenu` (`features/auth/components/UserMenu.tsx`)

**The important part:** preferences must visibly change behaviour, not merely
persist. `reviewDepth` alters prompt verbosity and `includeRefactor` removes
the refactor section — worth ~1,500 output tokens. A settings page whose
toggles do nothing is immediately obvious to a technical reviewer.

### 2. Accessibility pass (~20 min)

Not yet audited systematically. Components were built with labels, focus rings
and `aria-live` as they went, but nothing has been measured.

- Run axe or Lighthouse against `/`, `/demo`, `/dashboard`, `/review/new`
- Check keyboard paths, especially the Monaco editor and the dropdown menus
- Target Lighthouse a11y ≥ 95

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
