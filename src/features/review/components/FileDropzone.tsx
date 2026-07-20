"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  ACCEPTED_EXTENSIONS,
  inferLanguageFromFilename,
} from "@/config/languages";
import { MAX_SOURCE_CHARS } from "@/config/limits";
import { cn } from "@/lib/utils";

import type { Language } from "../schemas/review-input.schema";

interface FileDropzoneProps {
  onFileLoaded: (
    contents: string,
    language: Language | null,
    filename: string,
  ) => void;
  disabled?: boolean;
}

/**
 * Drag-and-drop or click-to-browse file input.
 *
 * The file is read in the browser and its text sent as JSON — it is never
 * uploaded as a multipart body. That keeps the server contract identical for
 * pasted and uploaded code, so there is exactly one review path.
 *
 * Oversized files are rejected here rather than at the API, so the user finds
 * out immediately instead of after a round trip.
 */
export function FileDropzone({ onFileLoaded, disabled }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    // Guard before reading: a very large file would otherwise be pulled
    // entirely into memory just to be rejected.
    if (file.size > MAX_SOURCE_CHARS * 4) {
      toast.error("That file is too large", {
        description: `The limit is ${MAX_SOURCE_CHARS.toLocaleString()} characters.`,
      });
      return;
    }

    const text = await file.text();

    if (text.length > MAX_SOURCE_CHARS) {
      toast.error("That file is too long to review", {
        description: `${text.length.toLocaleString()} characters — the limit is ${MAX_SOURCE_CHARS.toLocaleString()}.`,
      });
      return;
    }

    const language = inferLanguageFromFilename(file.name);

    if (!language) {
      toast.warning("Unrecognised file type", {
        description: "Loaded anyway — pick the language manually.",
      });
    }

    onFileLoaded(text, language, file.name);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        const file = event.dataTransfer.files[0];
        if (file) void handleFile(file);
      }}
      className={cn(
        "rounded-md border border-dashed transition-colors",
        isDragging && "border-primary bg-primary/5",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="focus-visible:ring-ring flex w-full items-center justify-center gap-2 rounded-md px-4 py-4 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed"
      >
        <Upload className="size-4" aria-hidden="true" />
        <span>
          <span className="font-medium">Upload a file</span>
          <span className="text-muted-foreground"> or drag it here</span>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        aria-label="Upload a source file"
        accept={ACCEPTED_EXTENSIONS}
        className="sr-only"
        // Reset so selecting the same file twice still fires onChange.
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
        tabIndex={-1}
      />
    </div>
  );
}
