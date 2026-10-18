/**
 * Live smoke test of the real private Google Apps Script Drive gateway.
 * Reads server-only .env.local, never prints secrets, URLs, file IDs or file bytes.
 * Creates and trashes ONE small ephemeral image. Does not write to Supabase.
 * Run only against a dedicated/staging root folder with the owner's approval.
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";

function loadEnv(file = ".env.local") {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    const value = m[2].trim();
    process.env[m[1]] = value.replace(/^(['"])(.*)\1$/, "$2");
  }
}
loadEnv();

const url = process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL;
const secret = process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET;
if (!url || !secret || secret.length < 24)
  throw new Error("Missing valid server-only Apps Script storage configuration");

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9fY9Y7wAAAAASUVORK5CYII=",
  "base64",
);
const sha256 = b => createHash("sha256").update(b).digest("hex");
async function request(body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ secret, ...body }),
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
  });
  if (!(res.headers.get("content-type") || "").includes("application/json")) {
    const type = (res.headers.get("content-type") || "").split(";")[0].slice(0, 60);
    const host = (() => { try { return new URL(res.url).hostname; } catch { return "unknown"; } })();
    throw new Error("Storage gateway returned non-JSON: HTTP " + res.status +
      ", content-type=" + (type || "(missing)") + ", host=" + host);
  }
  const raw = await res.json().catch(() => ({}));
  return { status: res.status, ...raw };
}
const app = "SMOKE-" + randomUUID().replaceAll("-", "").slice(0, 16);
const payload = {
  action: "upload", applicationCode: app, category: "criterion_c1",
  fileName: "temporary-probe.png", mimeType: "image/png",
  uploadKey: "smoke-" + randomUUID(),
  base64: png.toString("base64"), sha256: sha256(png),
};
let fileId;
try {
  const uploaded = await request(payload);
  if (!uploaded.ok || !/^[A-Za-z0-9_-]{10,200}$/.test(uploaded.data?.id || ""))
    throw new Error("Upload failed: " + (uploaded.code || "INVALID_RESPONSE"));
  fileId = uploaded.data.id;
  console.log("PASS: private Google Drive upload");

  const repeated = await request(payload);
  if (!repeated.ok || repeated.data?.id !== fileId)
    throw new Error("Idempotent retry returned a different Drive file");
  console.log("PASS: same-key upload reused the original Drive file");

  const mutated = Buffer.from(png);
  mutated[mutated.length - 5] ^= 1;
  const conflict = await request({
    ...payload, base64: mutated.toString("base64"), sha256: sha256(mutated),
  });
  if (conflict.ok || conflict.code !== "STORAGE_CONTENT_MISMATCH")
    throw new Error("Changed content under the same key was not rejected");
  console.log("PASS: changed content under same key rejected");

  const downloaded = await request({ action: "download", fileId });
  const data = Buffer.from(downloaded.data?.base64 || "", "base64");
  if (!downloaded.ok || sha256(data) !== sha256(png) ||
      downloaded.data?.sha256 !== sha256(png))
    throw new Error("Downloaded bytes failed SHA-256 verification");
  console.log("PASS: download bytes and independent SHA-256 verified");

  const deleted = await request({ action: "delete", fileId });
  if (!deleted.ok) throw new Error("Drive trash operation failed: " + (deleted.code || "UNKNOWN"));
  console.log("PASS: temporary file moved to Drive trash");
  const denied = await request({ action: "download", fileId });
  if (denied.ok) throw new Error("Trashed file was still downloadable");
  console.log("PASS: trashed file cannot be downloaded");
  fileId = undefined;
} finally {
  if (fileId) {
    const cleanup = await request({ action: "delete", fileId }).catch(() => null);
    if (!cleanup?.ok) console.error("WARN: probe cleanup failed; review Drive smoke folder under private root");
  }
}
console.log("LIVE STORAGE SMOKE TEST: PASS");
