import test from "node:test";
import assert from "node:assert/strict";
import { rateLimitBucket, requestClientAddress } from "../lib/security-primitives.ts";
import { parseLimitedFormData, RequestTooLargeError } from "../lib/request-limits.ts";

test("rate-limit buckets are deterministic, scoped and never expose identity", () => {
  const a = rateLimitBucket("upload:user", "student-id@example.com", "private-secret");
  const b = rateLimitBucket("upload:user", "student-id@example.com", "private-secret");
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.equal(a.includes("student"), false);
  assert.notEqual(a, rateLimitBucket("download:user", "student-id@example.com", "private-secret"));
  assert.notEqual(a, rateLimitBucket("upload:user", "student-id@example.com", "different-secret"));
});

test("invalid rate-limit scopes or identities are rejected", () => {
  assert.throws(() => rateLimitBucket("UPPER CASE", "id", "secret"));
  assert.throws(() => rateLimitBucket("upload", "", "secret"));
  assert.throws(() => rateLimitBucket("upload", "id", ""));
});

test("proxy IP fallback does not trust arbitrary X-Forwarded-For", () => {
  const forged = new Request("https://app.local", { headers: { "x-forwarded-for": "1.2.3.4" } });
  assert.equal(requestClientAddress(forged), "unknown");
  const trusted = new Request("https://app.local", { headers: { "x-vercel-forwarded-for": "203.0.113.5" } });
  assert.equal(requestClientAddress(trusted), "203.0.113.5");
});

test("multipart parser enforces Content-Length before parsing", async () => {
  const payload = new FormData();
  payload.set("file", new File([new Uint8Array(16)], "sample.pdf", { type: "application/pdf" }));
  const request = new Request("https://app.local/upload", { method: "POST", body: payload });
  request.headers.set("content-length", "99999");
  await assert.rejects(() => parseLimitedFormData(request, 2048), RequestTooLargeError);
});

test("multipart parser enforces byte limit even without Content-Length", async () => {
  const request = new Request("https://app.local/upload", {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=test" },
    body: new Uint8Array(4096),
  });
  await assert.rejects(() => parseLimitedFormData(request, 1024), RequestTooLargeError);
});

test("valid multipart passes safely", async () => {
  const payload = new FormData();
  payload.set("applicationId", "example-id");
  payload.set("file", new File(["hello"], "example.txt", { type: "text/plain" }));
  const request = new Request("https://app.local/upload", { method: "POST", body: payload });
  const parsed = await parseLimitedFormData(request, 4096);
  assert.equal(parsed.get("applicationId"), "example-id");
  assert.equal(parsed.get("file")?.name, "example.txt");
});
