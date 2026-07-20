import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-muted-foreground font-mono text-sm">404</p>
      <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm text-pretty">
        {/* A review owned by someone else also lands here, by design: a
            distinct "not allowed" page would confirm the id exists. */}
        That page does not exist, or you do not have access to it.
      </p>

      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/demo">See an example review</Link>
        </Button>
      </div>
    </div>
  );
}
