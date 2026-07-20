import { Badge } from "@/components/ui/badge";

import type { Suggestion } from "../../schemas/review-result.schema";

/**
 * Renders maintainability notes AND best practices.
 *
 * These were two different shapes until the model kept confusing them and
 * Groq rejected whole responses. Unifying the schema fixed the AI failure and
 * removed a component here — the same change paying off twice.
 */
export function SuggestionList({
  suggestions,
  emptyMessage,
}: {
  suggestions: Suggestion[];
  emptyMessage: string;
}) {
  if (suggestions.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {suggestions.map((suggestion, index) => (
        <li key={`${suggestion.title}-${index}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{suggestion.title}</h3>
            <Badge variant="outline" className="text-xs">
              {suggestion.impact} impact
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            {suggestion.description}
          </p>
        </li>
      ))}
    </ul>
  );
}
