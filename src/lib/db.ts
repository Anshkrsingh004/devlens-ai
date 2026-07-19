import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv, isProduction } from "@/lib/env";

/**
 * Prisma client singleton.
 *
 * Two problems are solved here.
 *
 * 1. Connection exhaustion. Serverless functions open many short-lived
 *    instances, so the client uses the POOLED connection (DATABASE_URL, port
 *    6543 via Supavisor). The direct connection is reserved for the CLI —
 *    see prisma.config.ts.
 *
 * 2. Hot-module reloading. In development Next.js re-evaluates modules on
 *    every change; without caching on globalThis, each reload would leak a
 *    new client and its pool until Postgres refuses connections. The cache is
 *    dev-only: in production the module is evaluated once per instance.
 *
 * `server-only` makes importing this from a client component a build error
 * rather than a runtime surprise.
 */

function createPrismaClient(): PrismaClient {
  const { DATABASE_URL } = getServerEnv();

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (!isProduction) {
  globalForPrisma.prisma = db;
}
