import { readFileSync, existsSync } from "node:fs";

function loadPublicEnv() {
  if (!existsSync(".env.local")) return;
  for (const raw of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

loadPublicEnv();
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) {
  console.error("FAIL: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY chưa hợp lệ.");
  process.exit(1);
}

const headers = { apikey: key, Accept: "application/json" };
let exitCode = 0;
async function probe(name, path, mustExist = false) {
  try {
    const response = await fetch(url + path, {
      method: "GET", headers,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    let errorCode = "";
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      errorCode = typeof body.code === "string" ? body.code : "";
    }
    if (response.ok) {
      console.log(`OK: ${name} — HTTP ${response.status}`);
      return;
    }
    if (mustExist && [401, 403].includes(response.status) && ["42501", "PGRST301"].includes(errorCode)) {
      console.log(`OK: ${name} — bảng tồn tại, truy cập ẩn danh bị quyền/RLS chặn (HTTP ${response.status})`);
      return;
    }
    console.error(`FAIL: ${name} — HTTP ${response.status}${errorCode ? ` (${errorCode})` : ""}`);
    exitCode = 1;
  } catch (error) {
    console.error(`FAIL: ${name} — ${error instanceof Error ? error.message : "Lỗi kết nối"}`);
    exitCode = 1;
  }
}

console.log("Kiểm tra Supabase không đăng nhập; không in khóa API.");
await probe("Supabase Auth", "/auth/v1/health");
await probe("Supabase Auth settings", "/auth/v1/settings");
for (const table of ["profiles", "branches", "evaluation_periods", "applications", "application_criteria", "review_history", "award_rubrics", "award_score_entries", "award_score_history", "evidence_entries", "storage_cleanup_queue"]) {
  await probe(`public.${table} (schema)`, `/rest/v1/${table}?select=*&limit=0`, true);
}
// A working Auth endpoint is insufficient: named evidence entries require
// migration 07. Migration 08 (T1–T6 constraints/RPCs) must also be verified
// in staging; an anonymous SELECT cannot confirm its installation.
await probe("public.evidences.evidence_entry_id (migration 07)", "/rest/v1/evidences?select=evidence_entry_id&limit=0", true);
await probe("public.evidences.upload_key (idempotency)", "/rest/v1/evidences?select=upload_key&limit=0", true);
await probe("public.evidences.content_sha256 (migration 09)", "/rest/v1/evidences?select=content_sha256&limit=0", true);
if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("INFO: Chưa có SUPABASE_SECRET_KEY (cần cho API tạo hồ sơ/tài khoản và minh chứng).");
}
if (!process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL || !process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET) {
  console.warn("INFO: Kho minh chứng Google Apps Script chưa được cấu hình.");
}
if (exitCode) {
  console.error("Hướng xử lý: xem docs/SETUP_SUPABASE_NEW_PROJECT.md; chỉ chủ dự án mới có thể chạy DDL trong SQL Editor.");
}
process.exitCode = exitCode;
