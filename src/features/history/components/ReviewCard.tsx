"use client";

import { AlertCircle, Loader2, Star, Trash2 } from "lucide-react";
import Link from "next/link";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLanguageConfig } from "@/config/languages";
import { cn } from "@/lib/utils";

import type { ReviewListItem } from "../hooks/useReviews";

/** Relative time without a date library — this is the only place we need it. */
function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`;

  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

interface ReviewCardProps {
  review: ReviewListItem;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onDelete: (id: string) => void;
}

export function ReviewCard({
  review,
  onToggleFavorite,
  onDelete,
}: ReviewCardProps) {
  const language = getLanguageConfig(review.language);
  const isFailed = review.status === "FAILED";
  const isPending = review.status === "PENDING";

  return (
    <Card className="hover:bg-muted/40 group relative gap-0 p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/*
            The whole card is clickable via this stretched link, but it stays a
            real <a> so it is keyboard-focusable and opens in a new tab with
            ctrl-click. The action buttons sit above it via z-index.
          */}
          <Link
            href={`/review/${review.id}`}
            className="focus-visible:ring-ring rounded-sm before:absolute before:inset-0 focus-visible:ring-2 focus-visible:outline-none"
          >
            <h3 className="truncate font-medium">{review.title}</h3>
          </Link>

          <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="text-xs">
              {language.label}
            </Badge>
            <span>{relativeTime(review.createdAt)}</span>

            {isFailed ? (
              <span className="text-destructive flex items-center gap-1">
                <AlertCircle className="size-3" aria-hidden="true" />
                Failed
              </span>
            ) : null}

            {isPending ? (
              <span className="flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                In progress
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-1">
          {review.overallScore !== null ? (
            <ScoreBadge score={review.overallScore} />
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleFavorite(review.id, !review.isFavorite)}
            aria-label={
              review.isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={review.isFavorite}
          >
            <Star
              className={cn(
                "size-4",
                review.isFavorite && "fill-amber-400 text-amber-400",
              )}
              aria-hidden="true"
            />
          </Button>

          <ConfirmDialog
            isDestructive
            title="Delete this review?"
            description="The review and its source code are permanently removed. This cannot be undone."
            confirmLabel="Delete"
            onConfirm={() => onDelete(review.id)}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete review: ${review.title}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            }
          />
        </div>
      </div>
    </Card>
  );
}
