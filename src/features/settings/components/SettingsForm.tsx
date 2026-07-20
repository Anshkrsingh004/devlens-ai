"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGE_CONFIGS, type Language } from "@/config/languages";
import { apiRequest } from "@/lib/api-client";

interface Preferences {
  theme: "LIGHT" | "DARK" | "SYSTEM";
  defaultLanguage: Language;
  reviewDepth: "CONCISE" | "BALANCED" | "THOROUGH";
  includeRefactor: boolean;
}

const DEPTH_OPTIONS = [
  {
    value: "CONCISE",
    label: "Concise",
    hint: "Highest-impact findings only. Cheapest in tokens.",
  },
  {
    value: "BALANCED",
    label: "Balanced",
    hint: "What a careful reviewer would raise in a pull request.",
  },
  {
    value: "THOROUGH",
    label: "Thorough",
    hint: "Exhaustive, including minor style and naming. Uses the most tokens.",
  },
] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

/**
 * Settings.
 *
 * Every control here genuinely changes behaviour rather than only persisting.
 * `reviewDepth` alters prompt verbosity and `includeRefactor` removes the
 * refactor section from the request — worth roughly 1,500 output tokens
 * against an 8,000-per-minute ceiling, which is the difference between a
 * large file succeeding and hitting a rate limit.
 */
export function SettingsForm() {
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();

  const query = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiRequest<Preferences>("/api/preferences"),
  });

  const update = useMutation({
    mutationFn: (input: Partial<Preferences>) =>
      apiRequest<Preferences>("/api/preferences", {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["preferences"], data);
      toast.success("Preferences saved");
    },
    onError: () => toast.error("Could not save preferences"),
  });

  if (query.isPending) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Could not load your preferences.
        </p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const preferences = query.data;

  return (
    <div className="space-y-6">
      <Section
        title="Appearance"
        description="Applies immediately and is remembered on this device."
      >
        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <Select
            value={preferences.theme}
            onValueChange={(value) => {
              // Applied locally as well as persisted: next-themes owns what
              // the browser renders, the database owns the default on a new
              // device.
              setTheme(value.toLowerCase());
              update.mutate({ theme: value as Preferences["theme"] });
            }}
          >
            <SelectTrigger id="theme" className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SYSTEM">Match system</SelectItem>
              <SelectItem value="LIGHT">Light</SelectItem>
              <SelectItem value="DARK">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section
        title="Review preferences"
        description="These change what the AI is asked for, and how many tokens each review costs."
      >
        <div className="space-y-2">
          <Label htmlFor="defaultLanguage">Default language</Label>
          <Select
            value={preferences.defaultLanguage}
            onValueChange={(value) =>
              update.mutate({ defaultLanguage: value as Language })
            }
          >
            <SelectTrigger id="defaultLanguage" className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_CONFIGS.map((config) => (
                <SelectItem key={config.value} value={config.value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">
            Pre-selected when you open the review workspace.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reviewDepth">Review depth</Label>
          <Select
            value={preferences.reviewDepth}
            onValueChange={(value) =>
              update.mutate({
                reviewDepth: value as Preferences["reviewDepth"],
              })
            }
          >
            <SelectTrigger id="reviewDepth" className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">
            {
              DEPTH_OPTIONS.find(
                (option) => option.value === preferences.reviewDepth,
              )?.hint
            }
          </p>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-md border p-3">
          <div>
            <Label htmlFor="includeRefactor">Include refactored code</Label>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Turning this off reclaims roughly 1,500 tokens per review, which
              can be the difference between a large file succeeding and hitting
              the rate limit. Generated code is a suggestion, not verified
              output.
            </p>
          </div>

          <Button
            id="includeRefactor"
            variant={preferences.includeRefactor ? "default" : "outline"}
            size="sm"
            role="switch"
            aria-checked={preferences.includeRefactor}
            onClick={() =>
              update.mutate({ includeRefactor: !preferences.includeRefactor })
            }
          >
            {preferences.includeRefactor ? "On" : "Off"}
          </Button>
        </div>
      </Section>
    </div>
  );
}
