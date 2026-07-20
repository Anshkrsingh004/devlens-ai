"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Global error boundary.
 *
 * Without this a render failure shows the browser's blank page, which reads
 * as the site being down. The message stays deliberately vague — an error
 * digest can contain internals, and the user cannot act on a stack trace.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle
        className="text-muted-foreground mb-4 size-8"
        aria-hidden="true"
      />
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm text-pretty">
        This page failed to load. Trying again often works — the error has been
        logged either way.
      </p>

      {error.digest ? (
        <p className="text-muted-foreground mt-4 font-mono text-xs">
          Reference: {error.digest}
        </p>
      ) : null}

      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RotateCcw aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
