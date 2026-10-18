/** Read multipart bodies with a hard byte ceiling BEFORE formData() decoding.
 * Content-Length is advisory only; the streaming counter is authoritative. */
export class RequestTooLargeError extends Error {
  constructor() { super("REQUEST_TOO_LARGE"); }
}
export async function parseLimitedFormData(request: Request, maxBytes: number): Promise<FormData> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error("Invalid body limit");
  const header = request.headers.get("content-length");
  if (header && /^\d+$/.test(header) && Number(header) > maxBytes) throw new RequestTooLargeError();
  if (!request.body) throw new Error("Request body missing");
  const chunks: Uint8Array[] = [];
  let count = 0;
  const reader = request.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      count += value.byteLength;
      if (count > maxBytes) throw new RequestTooLargeError();
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), count);
  return new Request(request.url, {
    method: "POST",
    headers: { "content-type": request.headers.get("content-type") || "" },
    body: bytes
  }).formData();
}
