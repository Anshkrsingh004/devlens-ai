"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type { Language } from "@/config/languages";
import { apiRequest } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ReviewListItem {
  id: string;
  title: string;
  language: Language;
  status: "PENDING" | "COMPLETED" | "FAILED";
  overallScore: number | null;
  isFavorite: boolean;
  createdAt: string;
}

interface ReviewPage {
  items: ReviewListItem[];
  nextCursor: string | null;
}

export interface ReviewFilters {
  search?: string;
  language?: Language;
  favoritesOnly?: boolean;
}

function buildQuery(filters: ReviewFilters, cursor?: string): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.language) params.set("language", filters.language);
  if (filters.favoritesOnly) params.set("favorite", "true");
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

export function useReviews(filters: ReviewFilters) {
  return useInfiniteQuery({
    // Filters are part of the key: without them, switching filters would show
    // the previous filter's cached results.
    queryKey: [...queryKeys.reviews.all, filters],
    queryFn: ({ pageParam }) =>
      apiRequest<ReviewPage>(`/api/reviews?${buildQuery(filters, pageParam)}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // Keeps the list on screen while a new filter loads, instead of flashing
    // an empty state on every keystroke.
    placeholderData: (previous) => previous,
  });
}

/**
 * Toggle favorite, optimistically.
 *
 * The rollback path is the part that matters: an optimistic update that only
 * works when the server agrees is a latent bug. On failure the previous cache
 * is restored and the user is told, rather than being left with a star that
 * silently lies.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      apiRequest(`/api/reviews/${id}`, {
        method: "PATCH",
        body: { isFavorite },
      }),

    onMutate: async ({ id, isFavorite }) => {
      // Cancel in-flight refetches so they cannot overwrite our optimistic
      // write with stale server data.
      await queryClient.cancelQueries({ queryKey: queryKeys.reviews.all });

      const previous = queryClient.getQueriesData({
        queryKey: queryKeys.reviews.all,
      });

      queryClient.setQueriesData(
        { queryKey: queryKeys.reviews.all },
        (old: { pages: ReviewPage[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === id ? { ...item, isFavorite } : item,
              ),
            })),
          };
        },
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
      toast.error("Could not update favorite");
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
}

/**
 * Delete a review, optimistically, with undo.
 *
 * Undo works by re-adding nothing — the deletion is real. Instead the toast
 * simply reports what happened; a true undo would need soft deletes, and the
 * source code is the user's intellectual property, so a hard delete is the
 * honest behaviour.
 */
export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/reviews/${id}`, { method: "DELETE" }),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reviews.all });

      const previous = queryClient.getQueriesData({
        queryKey: queryKeys.reviews.all,
      });

      queryClient.setQueriesData(
        { queryKey: queryKeys.reviews.all },
        (old: { pages: ReviewPage[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== id),
            })),
          };
        },
      );

      return { previous };
    },

    onError: (_error, _id, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
      toast.error("Could not delete review", {
        description: "It has been restored to your list.",
      });
    },

    onSuccess: () => {
      toast.success("Review deleted");
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
}

/**
 * Re-run a review that previously failed.
 *
 * The endpoint existed from M3 but nothing called it, so a failed review sat
 * in the dashboard with no way to recover it.
 *
 * No optimistic update: a retry takes several seconds and consumes quota, so
 * showing success before the server confirms would be a lie the user acts on.
 * The row is invalidated on completion instead.
 */
export function useRetryReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string; status: string; overallScore: number | null }>(
        `/api/reviews/${id}/retry`,
        { method: "POST" },
      ),

    onSuccess: (data) => {
      toast.success("Review completed", {
        description:
          data.overallScore !== null
            ? `Scored ${data.overallScore}/100.`
            : undefined,
      });
    },

    onError: (error) => {
      toast.error("Retry failed", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
      // A retry spends quota, so the usage meter is now stale too.
      void queryClient.invalidateQueries({ queryKey: queryKeys.usage });
    },
  });
}

/**
 * Rename a review, optimistically.
 *
 * Without the optimistic write the card reverts to the old title while the
 * refetch is in flight — the user sees their edit apparently discarded, then
 * reappear a second later. Rollback restores the previous title on failure.
 */
export function useRenameReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiRequest(`/api/reviews/${id}`, { method: "PATCH", body: { title } }),

    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reviews.all });

      const previous = queryClient.getQueriesData({
        queryKey: queryKeys.reviews.all,
      });

      queryClient.setQueriesData(
        { queryKey: queryKeys.reviews.all },
        (old: { pages: ReviewPage[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === id ? { ...item, title } : item,
              ),
            })),
          };
        },
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
      toast.error("Could not rename review");
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
}
