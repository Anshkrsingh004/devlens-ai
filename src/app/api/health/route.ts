import { db } from "@/lib/db";

/**
 * Health check.
 *
 * Serves two purposes:
 *
 * 1. Deployment verification. Each milestone's acceptance criteria require
 *    checking this against the deployed URL, not just localhost.
 *
 * 2. Supabase keepalive. The free tier pauses a project after 7 days of
 *    inactivity, which would take the live demo offline. A daily GitHub
 *    Actions cron calls this endpoint (M7).
 *
 * It must issue a REAL query. Returning a static string would keep the route
 * responding while the database quietly paused underneath it — the endpoint
 * would report healthy right up until the app broke.
 */

// Never cache: a cached response would neither verify the database nor count
// as activity for the keepalive.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;

    return Response.json(
      {
        data: {
          status: "ok",
          db: "connected",
          timestamp: new Date().toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // The caught error is deliberately not returned to the client: it can
    // contain the connection string, including credentials.
    return Response.json(
      {
        error: {
          code: "INTERNAL",
          message: "Database unreachable",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
