"use client";

/**
 * Global error boundary — the last line of defense. Catches errors thrown in the
 * root layout itself (where the normal `error.tsx` cannot help) and renders its
 * own <html>/<body>. Without this, such an error yields a blank white screen.
 */
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to the browser console; the server copy is captured via
    // instrumentation. `digest` correlates with the server log entry.
    console.error("Global error:", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#faf6ef",
          color: "#16110f"
        }}
      >
        <main style={{ textAlign: "center", padding: "2rem", maxWidth: 480 }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: 9999,
              border: "none",
              background: "#16110f",
              color: "#faf6ef",
              cursor: "pointer",
              fontSize: "0.95rem"
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
