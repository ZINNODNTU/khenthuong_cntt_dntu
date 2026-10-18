import { readFileSync, existsSync } from "node:fs";

/**
 * Operator-only, read-only connectivity diagnostic.
 * Never print the shared secret, URL deployment ID, private Drive folder ID,
 * raw HTML (which may contain login identifiers) or full remote exceptions.
 */
function loadEnvFile(fileName) {
  if (!existsSync(fileName)) return;
  for (const original of readFileSync(fileName, "utf8").split(/\r?\n/)) {
    const line = original.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const name = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[name]) process.env[name] = value;
  }
}

function requiredConfig() {
  const rawUrl = String(process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL || "").trim();
  const secret = String(process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET || "").trim();
  if (!rawUrl) throw new Error("Missing GOOGLE_APPS_SCRIPT_WEB_APP_URL");
  if (secret.length < 24) throw new Error("GOOGLE_APPS_SCRIPT_SHARED_SECRET must be at least 24 characters");
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error("Google Apps Script deployment URL is invalid"); }
  const normalizedPath = url.pathname.replace(/\/+$/, "");
  if (url.protocol !== "https:" || url.hostname !== "script.google.com" ||
      !(/^\/macros\/s\/[^/]+\/exec$/.test(normalizedPath) ||
        /^\/a\/macros\/[^/]+\/s\/[^/]+\/exec$/.test(normalizedPath))) {
    throw new Error("Google Apps Script URL must be a script.google.com /exec deployment");
  }
  url.search = "";
  url.hash = "";
  return { url: url.toString(), secret };
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  const { url, secret } = requiredConfig();
  console.log("Checking Google Apps Script health (endpoint and secrets redacted)");
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json; charset=UTF-8", accept: "application/json" },
      body: JSON.stringify({ action: "health", secret }),
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    throw new Error(timedOut ? "Gateway timed out after 20 seconds" : "Cannot connect to Apps Script gateway");
  }
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    throw new Error("Gateway returned HTML or a non-JSON response; check Web App deployment/access settings");
  }
  const body = await response.text();
  let parsed;
  try { parsed = JSON.parse(body); }
  catch { throw new Error("Gateway response was not valid JSON"); }
  if (!response.ok || !parsed?.ok) {
    const code = typeof parsed?.code === "string" && /^[A-Z0-9_]{5,70}$/.test(parsed.code)
      ? parsed.code : "STORAGE_GATEWAY_ERROR";
    throw new Error("Gateway rejected health request: " + code);
  }
  if (!parsed.data || typeof parsed.data.version !== "string" ||
      !parsed.data.version.startsWith("2.")) {
    throw new Error("Gateway requires Apps Script v2.x; redeploy Code.gs and create a new Web App version");
  }
  console.log("PASS: Apps Script gateway v" + parsed.data.version + " responds with server-only credentials");
}

main().catch(error => {
  console.error("FAIL:", error instanceof Error ? error.message : "Unknown health error");
  process.exitCode = 1;
});
