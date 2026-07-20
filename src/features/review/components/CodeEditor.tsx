"use client";

import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

import { Skeleton } from "@/components/ui/skeleton";
import { getLanguageConfig } from "@/config/languages";
import type { Language } from "../schemas/review-input.schema";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  disabled?: boolean;
  height?: number;
}

/**
 * Monaco wrapper.
 *
 * Monaco is large and touches `window` during initialisation, so it must not
 * be server-rendered. `@monaco-editor/react` already loads it lazily and
 * shows the `loading` element until it is ready, which is why this file does
 * not need its own `next/dynamic` wrapper.
 *
 * The loading skeleton matches the editor's height so the page does not jump
 * when it swaps in.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  disabled = false,
  height = 420,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="overflow-hidden rounded-md border">
      <Editor
        height={height}
        // Remounting on language change is intentional: Monaco caches the
        // tokenizer per model, and switching languages in place occasionally
        // leaves stale highlighting.
        language={getLanguageConfig(language).monacoId}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
        loading={<Skeleton className="h-full w-full rounded-none" />}
        beforeMount={(monaco) => {
          // Turn off Monaco's TypeScript/JavaScript diagnostics.
          //
          // This is a review tool, not an IDE. Users paste fragments that
          // reference imports and types the snippet does not contain, so the
          // validator marks perfectly good code with red squiggles — telling
          // them their code looks broken before we have reviewed anything.
          // Syntax highlighting stays; only the error reporting goes.
          for (const defaults of [
            monaco.languages.typescript.typescriptDefaults,
            monaco.languages.typescript.javascriptDefaults,
          ]) {
            defaults.setDiagnosticsOptions({
              noSemanticValidation: true,
              noSyntaxValidation: true,
              noSuggestionDiagnostics: true,
            });
          }
        }}
        options={{
          // Monaco renders a hidden textarea that screen readers announce;
          // without a name it is reported as an unlabelled form control.
          ariaLabel: "Source code editor",
          readOnly: disabled,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 12, bottom: 12 },
          // The reviewer reads line numbers from our own numbering, so
          // rendering whitespace would only add noise.
          renderWhitespace: "none",
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        }}
      />
    </div>
  );
}
