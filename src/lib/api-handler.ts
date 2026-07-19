import { ZodError } from "zod";

import { AppError, errors, isAppError } from "@/lib/errors";
import { isProduction } from "@/lib/env";

/**
 * Route handler wrapper.
 *
 * Every handler returns plain data and throws on failure; this maps the
 * result into the standard envelope and errors into status codes. Because it
 * exists, no route writes try/catch and every response has the same shape
 * (API.md §1.1).
 */

interface SuccessOptions {
  status?: number;
  headers?: Record<string, string>;
}

/** Wrap a payload with an explicit status, e.g. 201 for a created review. */
export class ApiResponse<T> {
  constructor(
    readonly data: T,
    readonly options: SuccessOptions = {},
  ) {}
}

type Handler<Context> = (
  request: Request,
  context: Context,
) => Promise<unknown>;

function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;

  // A Zod failure at the transport layer means a malformed request body.
  if (error instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      details[key] ??= issue.message;
    }
    return errors.validation("Some fields need attention.", details);
  }

  return errors.internal();
}

export function withApiHandler<Context = unknown>(handler: Handler<Context>) {
  return async (request: Request, context: Context): Promise<Response> => {
    try {
      const result = await handler(request, context);

      // A handler may return a Response directly (file downloads in M6).
      if (result instanceof Response) return result;

      const { data, options } =
        result instanceof ApiResponse
          ? { data: result.data, options: result.options }
          : { data: result, options: {} as SuccessOptions };

      return Response.json(
        { data },
        {
          status: options.status ?? 200,
          headers: {
            "Cache-Control": "private, no-store",
            ...options.headers,
          },
        },
      );
    } catch (error) {
      const appError = toAppError(error);

      // Log the real cause server-side. Never include source code, tokens or
      // connection strings — see CLAUDE.md §10.
      if (appError.code === "INTERNAL") {
        console.error("[api] unhandled error", {
          message: error instanceof Error ? error.message : String(error),
          stack:
            !isProduction && error instanceof Error ? error.stack : undefined,
        });
      }

      return Response.json(
        {
          error: {
            code: appError.code,
            message: appError.message,
            ...(appError.details ? { details: appError.details } : {}),
          },
        },
        {
          status: appError.status,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
  };
}
