import { Loader2 } from "lucide-react";

/** Route-level Suspense fallback for the (main) segment. */
export default function Loading() {
  return (
    <main className="grid min-h-[60vh] place-items-center" aria-busy="true" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
    </main>
  );
}
