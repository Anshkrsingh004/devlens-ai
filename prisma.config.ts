import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI configuration.
 *
 * Two things are set up here that are easy to get wrong.
 *
 * 1. Environment loading. The CLI reads `.env` by default, but this project
 *    keeps all secrets in `.env.local` — the file Next.js reads and the one
 *    `.gitignore` protects. Without this bridge, `prisma migrate` fails with
 *    a confusing "environment variable not found". `process.loadEnvFile` is
 *    built into Node 20.12+, so it costs no dependency; duplicating the
 *    credentials into a second `.env` is how two copies drift apart.
 *
 * 2. Which connection URL the CLI uses. Prisma 7 removed `directUrl`, so the
 *    pooled/direct split is expressed by *where* each URL is consumed:
 *
 *      - This file (CLI: migrate, db pull, studio) -> DIRECT_URL, port 5432.
 *        Migrations need a session-mode connection; pgbouncer's transaction
 *        mode cannot run them and they hang or fail cryptically.
 *
 *      - src/lib/db.ts (the app at runtime) -> DATABASE_URL, port 6543.
 *        Serverless functions open many short-lived connections and would
 *        exhaust a direct connection pool.
 *
 *    Swapping these is DATABASE.md's R3 risk: hanging migrations, or
 *    `prepared statement "s0" already exists` under production concurrency.
 */
// `.env.local` exists only on developer machines. On CI and Vercel the
// variables are injected into the environment directly, and the file is
// absent — `loadEnvFile` throws in that case, which would break every build.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No local env file: fall back to the ambient environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
