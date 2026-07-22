"use client";

/**
 * Route-segment error boundary for the root. Renders inside the existing layout
 * (navbar/footer stay), so a thrown error in any page degrades to a recoverable
 * message instead of a white screen.
 */
import { AlertTriangle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="grid min-h-[60vh] place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          We hit an unexpected error loading this page. You can retry, or head back home.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground/70">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset} className="gap-2">
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
