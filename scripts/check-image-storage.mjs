import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const rawUrl = (process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL || "").trim();
  const secret = (process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET || "").trim();
  if (!rawUrl) throw new Error("Missing GOOGLE_APPS_SCRIPT_WEB_APP_URL in .env.local");
  if (!secret) throw new Error("Missing GOOGLE_APPS_SCRIPT_SHARED_SECRET in .env.local");

  const url = new URL(rawUrl);
  const normalizedPath = url.pathname.replace(/\/+$/, "");
  const publicPattern = /^\/macros\/s\/[^/]+\/exec$/;
  const workspacePattern = /^\/a\/macros\/[^/]+\/s\/[^/]+\/exec$/;
  if (url.hostname !== "script.google.com" || (!publicPattern.test(normalizedPath) && !workspacePattern.test(normalizedPath))) {
    throw new Error("The URL must end with /exec and match /macros/s/... or /a/macros/domain/s/...");
  }

  url.pathname = normalizedPath;
  url.search = "";
  url.hash = "";

  console.log("Image storage diagnostic");
  console.log("Endpoint:", url.toString());
  console.log("Secret length:", secret.length);
  console.log("Sending health request...");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=UTF-8",
      accept: "application/json",
    },
    body: JSON.stringify({ action: "health", secret }),
    redirect: "follow",
  });

  const raw = await response.text();
  console.log("HTTP status:", response.status);
  console.log("Content-Type:", response.headers.get("content-type") || "(none)");

  if (raw.trimStart().startsWith("<")) {
    throw new Error(
      `The deployment returned HTML instead of JSON. It may require Google sign-in, be outdated, or use the wrong deployment. Response: ${raw.replace(/\s+/g, " ").slice(0, 240)}`,
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON response: ${raw.slice(0, 240)}`);
  }

  if (!response.ok || !parsed.ok) {
    throw new Error(`${parsed.code || "STORAGE_ERROR"}: ${parsed.error || raw}`);
  }

  console.log("SUCCESS");
  console.log(JSON.stringify(parsed.data, null, 2));
}

main().catch((error) => {
  console.error("FAILED:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
