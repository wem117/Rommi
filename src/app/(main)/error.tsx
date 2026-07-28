"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/** Error boundary scoped to the (main) app shell (browse, profile, inbox…). */
export default function MainError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Main route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">This page failed to load</h1>
        <p className="mt-2 text-muted-foreground">Please retry. If it keeps happening, come back shortly.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset} className="gap-2">
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/rooms">Browse rooms</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
