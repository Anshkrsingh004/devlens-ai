"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api-client";

/**
 * TanStack Query provider.
 *
 * The client is created inside useState rather than at module scope: a
 * module-level client would be shared across every request on the server,
 * leaking one user's cached data into another's response.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Retrying a 401 or 404 just delays the inevitable and hides the
            // real problem. Only transient failures are worth a second go.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status < 500) return false;
              return failureCount < 2;
            },
          },
          mutations: {
            // Reviews consume quota. An automatic retry could silently spend
            // a user's daily allowance twice on one click.
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
