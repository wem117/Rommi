export type AsyncStatus = "idle" | "loading" | "retrying" | "success" | "error";

export function wait(delayMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

export async function withRetry<T>(
  work: () => Promise<T>,
  {
    retries = 2,
    baseDelayMs = 1000,
    onRetry
  }: {
    retries?: number;
    baseDelayMs?: number;
    onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
  } = {}
) {
  let attempt = 0;

  while (true) {
    try {
      return await work();
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** attempt;
      onRetry?.(attempt + 1, delayMs, error);
      await wait(delayMs);
      attempt += 1;
    }
  }
}
