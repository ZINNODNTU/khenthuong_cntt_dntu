/**
 * Retries only transient upload failures. The caller must supply a stable
 * idempotency key so a timed-out request cannot create duplicate evidence.
 */
export class UploadRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "UploadRequestError";
  }
}

export function shouldRetryUpload(error: unknown): boolean {
  if (error instanceof UploadRequestError) {
    return [408, 429, 500, 502, 503, 504].includes(error.status);
  }
  return error instanceof TypeError;
}

export async function retryTransientUpload<T>(
  operation: (attempt: number) => Promise<T>,
  delay: (milliseconds: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (!shouldRetryUpload(error) || attempt === 2) throw error;
      await delay(750 * (attempt + 1));
    }
  }
  throw new Error("Không thể tải minh chứng.");
}
