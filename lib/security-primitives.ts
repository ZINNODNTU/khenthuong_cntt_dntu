import { createHmac } from "node:crypto";

/** Pseudonymous rate-limit key; never store raw email, IP or student ID in the DB. */
export function rateLimitBucket(scope: string, identity: string, secret: string): string {
  if (!/^[a-z0-9:_-]{1,70}$/.test(scope) || !identity || !secret) {
    throw new Error("Invalid rate-limit input");
  }
  return createHmac("sha256", secret).update(scope + "\0" + identity).digest("hex");
}

export function requestClientAddress(request: Request): string {
  // Prefer the hosting proxy's own header. Never trust a client-provided X-Forwarded-For list.
  return request.headers.get("x-vercel-forwarded-for")?.split(",").at(-1)?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}
