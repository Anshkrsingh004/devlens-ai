"use client";

import { Download, FileCode2, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReviewResult } from "@/features/review/schemas/review-result.schema";

interface ExportMenuProps {
  reviewId: string;
  result: ReviewResult;
  title: string;
  language: string;
  createdAt: string;
}

/** Trigger a browser download from a Blob, cleaning up the object URL. */
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Without revoking, the blob is retained for the document's lifetime.
  URL.revokeObjectURL(url);
}

export function ExportMenu({
  reviewId,
  result,
  title,
  language,
  createdAt,
}: ExportMenuProps) {
  const [isBuildingPdf, setIsBuildingPdf] = useState(false);

  /**
   * PDF generation happens in the browser.
   *
   * The library and its font data are pulled in only when this runs, so
   * neither reaches the initial bundle. Server-side rendering would need
   * headless Chromium, which exceeds Vercel's 250 MB function limit.
   */
  async function handlePdf() {
    setIsBuildingPdf(true);

    try {
      const [{ pdf }, { ReviewPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../lib/ReviewPdf"),
      ]);

      const blob = await pdf(
        <ReviewPdf
          result={result}
          title={title}
          language={language}
          createdAt={createdAt}
        />,
      ).toBlob();

      const { markdownFilename } = await import("../lib/to-markdown");
      download(
        blob,
        markdownFilename(title, createdAt).replace(/\.md$/, ".pdf"),
      );
    } catch {
      toast.error("Could not build the PDF", {
        description: "Try the Markdown export instead.",
      });
    } finally {
      setIsBuildingPdf(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isBuildingPdf}>
          {isBuildingPdf ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          {isBuildingPdf ? "Building PDF…" : "Export"}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          {/*
            Markdown is a plain link to the route handler, so the browser
            handles the download natively — no JS, and it works if the page's
            scripts fail.
          */}
          <a href={`/api/reviews/${reviewId}/export?format=md`} download>
            <FileCode2 aria-hidden="true" />
            Download Markdown
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => void handlePdf()}>
          <FileText aria-hidden="true" />
          Download PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
