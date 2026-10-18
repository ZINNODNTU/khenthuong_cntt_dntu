import test from "node:test";
import assert from "node:assert/strict";
import { UploadRequestError, retryTransientUpload, shouldRetryUpload } from "../lib/upload-retry.ts";

test("upload succeeds immediately without a delay", async () => {
  let calls = 0;
  const result = await retryTransientUpload(async () => ++calls, async () => {
    throw new Error("Unexpected delay");
  });
  assert.equal(result, 1);
  assert.equal(calls, 1);
});

test("temporary server failure is retried with bounded backoff", async () => {
  let calls = 0;
  const delays = [];
  const result = await retryTransientUpload(async attempt => {
    calls++;
    if (attempt < 2) throw new UploadRequestError("Temporary server error", 503);
    return "uploaded";
  }, async ms => { delays.push(ms); });
  assert.equal(result, "uploaded");
  assert.equal(calls, 3);
  assert.deepEqual(delays, [750, 1500]);
});

test("network errors and rate limits may be retried", async () => {
  assert.equal(shouldRetryUpload(new TypeError("Failed to fetch")), true);
  assert.equal(shouldRetryUpload(new UploadRequestError("Throttled", 429)), true);
});

test("invalid files and authorization failures are never retried", async () => {
  for (const status of [400, 401, 403, 413, 415]) {
    let calls = 0;
    await assert.rejects(
      () => retryTransientUpload(async () => {
        calls++;
        throw new UploadRequestError("Rejected", status);
      }, async () => {}),
      error => error instanceof UploadRequestError && error.status === status,
    );
    assert.equal(calls, 1);
  }
});

test("transient failure stops after three attempts", async () => {
  let calls = 0;
  await assert.rejects(
    () => retryTransientUpload(async () => {
      calls++;
      throw new UploadRequestError("Outage", 502);
    }, async () => {}),
    /Outage/,
  );
  assert.equal(calls, 3);
});
