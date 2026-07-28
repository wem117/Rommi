/**
 * Next.js instrumentation hook. `onRequestError` is invoked by the framework for
 * every uncaught error in Server Components, Route Handlers, and middleware — the
 * single choke point for server-side error capture. Previously these errors went
 * nowhere; now they are structured-logged and forwarded to the error tracker.
 */
import type { Instrumentation } from "next";

export async function register() {
  // Reserved for future OTEL/tracing setup. Kept so the hook is always present.
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { captureException } = await import("@/lib/observability/logger");
  await captureException(err, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath
  });
};
