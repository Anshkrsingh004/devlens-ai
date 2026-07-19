import { z } from "zod";

/**
 * Environment variable validation.
 *
 * This module is the ONLY place in the codebase permitted to read
 * `process.env` (CLAUDE.md R6). Every other module imports the parsed,
 * typed values from here.
 *
 * Validation runs at module load, so a missing or malformed variable fails
 * the build with a readable message instead of surfacing as `undefined`
 * somewhere deep in a request handler.
 *
 * Two scopes are kept separate on purpose:
 *
 *   - `clientEnv` holds `NEXT_PUBLIC_*` values. Next.js inlines these at
 *     build time, so they must be referenced as static literals — a
 *     dynamic lookup like `process.env[key]` is NOT substituted.
 *   - `serverEnv` holds everything else. It is validated only on the
 *     server and throws if it is ever reached from the browser, so a
 *     secret can never leak into the client bundle by accident.
 *
 * Server-only variables (DATABASE_URL, BETTER_AUTH_SECRET, GROQ_API_KEY…)
 * are added to `serverSchema` in later milestones. The split exists now so
 * that adding them is additive rather than a refactor.
 */

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  /**
   * Pooled connection (port 6543, `?pgbouncer=true`). Used by Prisma Client
   * at runtime — serverless functions open many short-lived connections and
   * would exhaust a direct pool.
   */
  DATABASE_URL: z.url(),

  /**
   * Direct connection (port 5432). Used only by the Prisma CLI: migrations
   * need a session-mode connection, which pgbouncer's transaction mode
   * cannot provide.
   */
  DIRECT_URL: z.url(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const key = issue.path.join(".") || "(root)";
      return `  • ${key}: ${issue.message}`;
    })
    .join("\n");
}

function parseOrThrow<T extends z.ZodType>(
  schema: T,
  source: unknown,
  scope: string,
): z.infer<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Invalid ${scope} environment variables:\n` +
        `${formatIssues(result.error)}\n\n` +
        `Compare your .env.local against .env.example.`,
    );
  }

  return result.data;
}

const isServer = typeof window === "undefined";

/**
 * Client-safe environment. Validated in both runtimes because these values
 * are inlined into the browser bundle and must be correct in each.
 */
export const clientEnv: ClientEnv = parseOrThrow(
  clientSchema,
  { NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL },
  "client",
);

const parsedServerEnv: ServerEnv | null = isServer
  ? parseOrThrow(serverSchema, process.env, "server")
  : null;

/**
 * Server-only environment.
 *
 * Accessed through a function rather than exported directly so that reaching
 * for it from the browser is a loud, immediate error rather than a silent
 * `undefined`.
 *
 * @throws if called in the browser.
 */
export function getServerEnv(): ServerEnv {
  if (parsedServerEnv === null) {
    throw new Error(
      "getServerEnv() was called in the browser. " +
        "Server environment variables are never exposed to the client — " +
        "use clientEnv for values that the browser legitimately needs.",
    );
  }

  return parsedServerEnv;
}

/** True when running the production build. Safe in both runtimes. */
export const isProduction = process.env.NODE_ENV === "production";
