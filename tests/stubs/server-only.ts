/**
 * Test stub for the `server-only` package.
 *
 * The real module throws when imported outside a React Server Component
 * context, which would block unit-testing any file in `server/`. Aliased in
 * vitest.config.ts only — the genuine guard still applies to every real
 * build, so importing server code from a client component remains a
 * build-time error.
 */
export {};
