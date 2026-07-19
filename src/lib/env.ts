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

  /**
   * Signing key for session cookies. Better Auth requires at least 32
   * characters; a shorter key weakens every session in the system, so it is
   * enforced here rather than trusted.
   */
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),

  /**
   * The origin this app is served from. Must match EXACTLY — including
   * scheme and absence of a trailing slash — or OAuth callbacks fail
   * silently, which is a genuinely painful bug to trace.
   */
  BETTER_AUTH_URL: z.url(),

  /** Google OAuth credentials (Google Cloud Console → Clients). */
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  /**
   * Groq API key (console.groq.com/keys). Free tier for gpt-oss-120b:
   * 30 RPM · 1,000 RPD · 8,000 TPM · 200,000 TPD.
   */
  GROQ_API_KEY: z.string().min(1).startsWith("gsk_"),

  /**
   * Injected automatically by Vercel — never set by hand.
   *
   * Vercel serves each project from several hostnames: the production alias,
   * a branch alias, and a unique URL per deployment. Better Auth rejects any
   * request whose origin is not trusted, so these are added to
   * `trustedOrigins` to stop sign-in failing with "invalid origin" on every
   * host except the one named in BETTER_AUTH_URL.
   *
   * Absent locally, hence optional. Note Vercel supplies these WITHOUT a
   * scheme (`my-app.vercel.app`), so they are not validated as URLs.
   */
  VERCEL_URL: z.string().optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
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
