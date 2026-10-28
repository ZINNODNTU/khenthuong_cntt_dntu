import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,}$/;
type Purpose = "recovery" | "signup";

const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function respond(status: number, code: string, message?: string) {
  return NextResponse.json(
    { ok: status === 200, code, ...(message ? { error: message } : {}) },
    { status, headers: HEADERS }
  );
}

/**
 * Same-origin mail gateway: browser extensions, campus filters or CORS must
 * not break the user's recovery request to Supabase. Do not use service-role
 * credentials for public Auth email operations.
 *
 * Supabase's built-in per-recipient/IP email rate limits remain effective.
 * Requests are deliberately not retried: mail submission is not idempotent.
 */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const requestOrigin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((requestOrigin && requestOrigin !== origin) || fetchSite === "cross-site") {
    return respond(403, "FORBIDDEN");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return respond(415, "UNSUPPORTED_MEDIA_TYPE");
  }
  if (Number(request.headers.get("content-length") || 0) > 1024) {
    return respond(413, "PAYLOAD_TOO_LARGE");
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 1024) return respond(413, "PAYLOAD_TOO_LARGE");
    payload = JSON.parse(raw);
  } catch {
    return respond(400, "INVALID_REQUEST");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return respond(400, "INVALID_REQUEST");
  }
  const { email: givenEmail, purpose } = payload as Record<string, unknown>;
  if (typeof givenEmail !== "string" || typeof purpose !== "string" ||
      (purpose !== "recovery" && purpose !== "signup")) {
    return respond(400, "INVALID_REQUEST");
  }
  const email = givenEmail.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email) ||
      (purpose === "signup" && !/^\d{5,20}@dntu\.edu\.vn$/.test(email))) {
    return respond(400, "INVALID_EMAIL", "Vui lòng nhập MSSV hoặc địa chỉ email phù hợp.");
  }

  const mode = purpose as Purpose;
  // Production must never send account links through another Supabase tenant.
  if (process.env.NODE_ENV === "production" &&
      new URL(env.supabaseUrl()).hostname !== "nzoamsyazdafyqnsxkny.supabase.co") {
    console.error("[auth.email.config]", { code: "SUPABASE_PROJECT_MISMATCH" });
    return respond(503, "SUPABASE_PROJECT_MISMATCH",
      "Hệ thống đang kết nối sai dự án xác thực. Vui lòng liên hệ quản trị.");
  }
  const redirectTo = new URL(mode === "recovery" ? "/auth/finish?mode=recovery" : "/auth/finish", env.appUrl());
  const endpoint = new URL(mode === "recovery" ? "/auth/v1/recover" : "/auth/v1/resend", env.supabaseUrl());
  endpoint.searchParams.set("redirect_to", redirectTo.toString());

  const upstreamStart = performance.now();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "apikey": env.supabasePublishableKey(),
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(mode === "recovery" ? { email } : { type: "signup", email }),
      cache: "no-store",
      // SMTP can be slow: avoid aborting a request after email delivery started.
      signal: AbortSignal.timeout(35000),
    });
    console.info("[auth.email.timing]", { purpose: mode, status: response.status, durationMs: Math.round(performance.now() - upstreamStart) });
    if (response.ok) {
      // A successful API request does not prove an email arrived or an account exists.
      return respond(200, "ACCEPTED");
    }
    // Never expose Supabase's error body or whether an email is registered.
    let upstreamCode = "";
    try {
      const body = await response.json() as { code?: string; error_code?: string };
      upstreamCode = String(body.code || body.error_code || "").slice(0, 64);
    } catch { /* no response body */ }
    if (response.status === 429 || /rate.limit|over_email_send_rate_limit/i.test(upstreamCode)) {
      return respond(429, "RATE_LIMITED", "Hệ thống đang giới hạn số lần gửi thư. Vui lòng thử lại sau ít phút.");
    }
    console.error("[auth.email.upstream]", { purpose: mode, status: response.status, code: upstreamCode });
    // Expose only a coarse diagnostic category, never provider details or account identity.
    if (response.status === 401 || response.status === 403) {
      return respond(503, "AUTH_CONFIGURATION_ERROR",
        "Dịch vụ xác thực email chưa được cấu hình đúng. Vui lòng liên hệ quản trị.");
    }
    if (response.status === 400 || response.status === 422) {
      return respond(503, "AUTH_REQUEST_REJECTED",
        "Hệ thống chưa xử lý được yêu cầu gửi thư. Vui lòng liên hệ quản trị.");
    }
    return respond(503, "UPSTREAM_EMAIL_FAILED",
      "Dịch vụ gửi thư đang gặp sự cố. Vui lòng thử lại sau hoặc liên hệ quản trị.");
  } catch (error) {
    console.error("[auth.email.network]", { purpose: mode, reason: error instanceof Error ? error.name : "unknown", durationMs: Math.round(performance.now() - upstreamStart) });
    return respond(503, "AUTH_UPSTREAM_UNREACHABLE",
      "Hệ thống tạm thời không kết nối được dịch vụ gửi thư. Vui lòng thử lại sau.");
  }
}
