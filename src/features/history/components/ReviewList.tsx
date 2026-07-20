"use client";

import { Plus, Search, Star } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LANGUAGE_CONFIGS, type Language } from "@/config/languages";
import { cn } from "@/lib/utils";

import {
  useDeleteReview,
  useRenameReview,
  useRetryReview,
  useReviews,
  useToggleFavorite,
} from "../hooks/useReviews";
import { ReviewCard } from "./ReviewCard";

/**
 * Review history with search and filters.
 *
 * Every list state is handled explicitly: loading, empty (no reviews at all),
 * empty (no matches for the current filter), error, and loaded. An unstyled
 * blank area reads as a bug rather than a state.
 */
export function ReviewList() {
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<Language | undefined>();
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Defers the query while keeping the input responsive — the effect a manual
  // debounce would give, without the timer or its cleanup.
  const deferredSearch = useDeferredValue(search);

  const query = useReviews({
    search: deferredSearch || undefined,
    language,
    favoritesOnly,
  });

  const toggleFavorite = useToggleFavorite();
  const deleteReview = useDeleteReview();
  const retryReview = useRetryReview();
  const renameReview = useRenameReview();

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const hasFilters = Boolean(deferredSearch || language || favoritesOnly);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reviews…"
            className="pl-9"
            aria-label="Search reviews by title"
          />
        </div>

        <Button
          variant={favoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setFavoritesOnly((current) => !current)}
          aria-pressed={favoritesOnly}
        >
          <Star
            className={cn("size-4", favoritesOnly && "fill-current")}
            aria-hidden="true"
          />
          Favorites
        </Button>

        <div className="flex flex-wrap gap-1">
          {LANGUAGE_CONFIGS.map((config) => (
            <Button
              key={config.value}
              variant={language === config.value ? "default" : "outline"}
              size="sm"
              aria-pressed={language === config.value}
              onClick={() =>
                setLanguage((current) =>
                  current === config.value ? undefined : config.value,
                )
              }
            >
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      {query.isPending ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-2 h-3 w-24" />
            </Card>
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <EmptyState
          title="Could not load your reviews"
          description="Something went wrong fetching your history."
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              Try again
            </Button>
          }
        />
      ) : null}

      {!query.isPending && !query.isError && items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No matching reviews"
            description="Try a different search term or clear the filters."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setLanguage(undefined);
                  setFavoritesOnly(false);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No reviews yet"
            description="Paste some code and get a structured engineering review."
            action={
              <Button asChild>
                <Link href="/review/new">
                  <Plus aria-hidden="true" />
                  New review
                </Link>
              </Button>
            }
          />
        )
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((review) => (
            <li key={review.id}>
              <ReviewCard
                review={review}
                onToggleFavorite={(id, isFavorite) =>
                  toggleFavorite.mutate({ id, isFavorite })
                }
                onDelete={(id) => deleteReview.mutate(id)}
                onRetry={(id) => retryReview.mutate(id)}
                onRename={(id, title) => renameReview.mutate({ id, title })}
                isRetrying={
                  retryReview.isPending && retryReview.variables === review.id
                }
              />
            </li>
          ))}
        </ul>
      ) : null}

      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
