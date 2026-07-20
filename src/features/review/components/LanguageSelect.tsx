"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGE_CONFIGS } from "@/config/languages";
import type { Language } from "../schemas/review-input.schema";

interface LanguageSelectProps {
  value: Language;
  onChange: (value: Language) => void;
  disabled?: boolean;
}

/** Language picker, driven entirely by config/languages.ts. */
export function LanguageSelect({
  value,
  onChange,
  disabled,
}: LanguageSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as Language)}
      disabled={disabled}
    >
      <SelectTrigger id="language" className="w-[180px]">
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGE_CONFIGS.map((config) => (
          <SelectItem key={config.value} value={config.value}>
            {config.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
