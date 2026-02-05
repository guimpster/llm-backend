export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries: number;
    shouldRetry: (error: unknown) => boolean;
    onRetry?: (error: unknown, attempt: number) => void;
  }
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.retries && options.shouldRetry(error)) {
        options.onRetry?.(error, attempt + 1);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
