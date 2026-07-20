/**
 * The five supported languages — the source of truth.
 *
 * Declared here rather than in the Zod schema because `config` is the
 * innermost layer and imports nothing; the schema derives its enum from this
 * list. The Prisma `Language` enum must be kept in step manually.
 */
export const LANGUAGES = [
  "CPP",
  "PYTHON",
  "JAVA",
  "JAVASCRIPT",
  "TYPESCRIPT",
] as const;

export type Language = (typeof LANGUAGES)[number];

/**
 * Per-language configuration.
 *
 * One entry drives the selector label, Monaco's syntax highlighting, and the
 * extension-to-language inference used by file upload. Adding a language means
 * editing this file and the Prisma enum — nothing else.
 */
export interface LanguageConfig {
  value: Language;
  label: string;
  /** Monaco's own language id, which does not always match ours. */
  monacoId: string;
  /** Lower-case, dot-prefixed. First entry is used when naming downloads. */
  extensions: string[];
}

export const LANGUAGE_CONFIGS: readonly LanguageConfig[] = [
  {
    value: "CPP",
    label: "C++",
    monacoId: "cpp",
    extensions: [".cpp", ".cc", ".cxx", ".hpp", ".h"],
  },
  {
    value: "PYTHON",
    label: "Python",
    monacoId: "python",
    extensions: [".py", ".pyw"],
  },
  { value: "JAVA", label: "Java", monacoId: "java", extensions: [".java"] },
  {
    value: "JAVASCRIPT",
    label: "JavaScript",
    monacoId: "javascript",
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
  },
  {
    value: "TYPESCRIPT",
    label: "TypeScript",
    monacoId: "typescript",
    extensions: [".ts", ".tsx", ".mts"],
  },
] as const;

export function getLanguageConfig(value: Language): LanguageConfig {
  const found = LANGUAGE_CONFIGS.find((config) => config.value === value);
  // Unreachable while Language and LANGUAGE_CONFIGS stay in sync; throwing
  // makes a future mismatch loud instead of silently unhighlighted.
  if (!found) throw new Error(`Unknown language: ${value}`);
  return found;
}

/** Infer a language from a filename. Returns null when unrecognised. */
export function inferLanguageFromFilename(filename: string): Language | null {
  const lower = filename.toLowerCase();
  const match = LANGUAGE_CONFIGS.find((config) =>
    config.extensions.some((ext) => lower.endsWith(ext)),
  );
  return match?.value ?? null;
}

/** Accept attribute for the file input, e.g. ".cpp,.py,.java,…" */
export const ACCEPTED_EXTENSIONS = LANGUAGE_CONFIGS.flatMap(
  (config) => config.extensions,
).join(",");
