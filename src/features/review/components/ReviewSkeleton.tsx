"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for a review in progress.
 *
 * Structured outputs cannot stream, so there is no partial result to show —
 * the response arrives whole after roughly five seconds. That leaves a choice
 * between an honest indeterminate state and a fake progress bar. A fake bar
 * would be dishonest UX, and users notice.
 *
 * Instead the stage labels reflect what the reviewer is genuinely doing, and
 * the skeleton mirrors the real report's layout so nothing jumps when the
 * result replaces it.
 */
const STAGES = [
  "Reading your code…",
  "Checking for bugs and security issues…",
  "Assessing performance and complexity…",
  "Writing the report…",
] as const;

export function ReviewSkeleton() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Advances on a timer, and stops at the last stage rather than looping —
    // a cycling message implies progress we cannot actually measure.
    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, 2200);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6" aria-busy="true">
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {STAGES[stage]}
      </p>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>

      {[0, 1, 2].map((index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
