/**
 * TanStack Query key factory.
 *
 * Every key in the application comes from here. Ad-hoc key strings are the
 * single most common cause of cache bugs — one typo and an invalidation
 * silently stops working, with no error to trace.
 */
export const queryKeys = {
  reviews: {
    all: ["reviews"] as const,
    detail: (id: string) => ["reviews", "detail", id] as const,
  },
  usage: ["usage"] as const,
} as const;
