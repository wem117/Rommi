import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false }
};

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-heading text-6xl font-bold text-primary">404</p>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/rooms">Browse rooms</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
