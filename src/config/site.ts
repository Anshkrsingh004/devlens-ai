/**
 * Static site metadata.
 *
 * Single source of truth for the product's name, tagline and description.
 *
 * Deliberately contains no environment-derived values. `config/` is the
 * innermost layer and imports nothing (PROJECT_STRUCTURE.md §7), so the
 * deployment URL lives in `lib/env.ts` where it belongs — it is environment,
 * not configuration. Consumers that need both import both.
 */
export const siteConfig = {
  name: "DevLens AI",
  tagline: "AI-Powered Code Review & Pull Request Assistant",
  description:
    "Paste your code and get a structured engineering review — bugs, security " +
    "issues, performance, complexity and a suggested refactor. Reviewed like a " +
    "senior engineer would, not like a chatbot.",
} as const;

export type SiteConfig = typeof siteConfig;
