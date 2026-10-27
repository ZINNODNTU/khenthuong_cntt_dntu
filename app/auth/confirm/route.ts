import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const acceptedTypes = new Set<EmailOtpType>(["email", "recovery", "invite", "magiclink", "email_change"]);

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") ||
      value.includes("\\") || /[\r\n]/.test(value)) return "/";
  return value;
}

function hasValidFields(tokenHash: string, type: string): type is EmailOtpType {
  // The token hash comes from Supabase. Never process arbitrary HTML or long payloads.
  return /^[A-Za-z0-9_-]{12,256}$/.test(tokenHash) &&
    acceptedTypes.has(type as EmailOtpType);
}

function invalidLink(origin: string, type?: string) {
  const path = type === "email" ? "/auth/finish?error=invalid_link&flow=signup" : "/auth/finish?error=invalid_link";
  return NextResponse.redirect(new URL(path, origin), 303);
}

function cleanHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

/** Only shows a confirmation button. Email security scanners often GET links. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash") || "";
  const type = url.searchParams.get("type") || "";
  if (!hasValidFields(tokenHash, type)) return invalidLink(url.origin, type);

  const recovery = type === "recovery";
  const heading = recovery ? "Xác nhận đặt lại mật khẩu" : "Xác nhận email tài khoản";
  const action = recovery ? "Tiếp tục đặt lại mật khẩu" : "Xác nhận và tiếp tục";
  const message = recovery
    ? "Nhấn nút bên dưới để xác minh yêu cầu khôi phục và mở trang thiết lập mật khẩu mới."
    : "Nhấn nút bên dưới để xác nhận địa chỉ email của tài khoản xét khen thưởng.";
  const next = recovery ? "/reset-password" : safeNext(url.searchParams.get("next"));
  const html = `<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${heading} | CNTT DNTU</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f1f4f8;color:#173751;font-family:Arial,Helvetica,sans-serif}
main{width:min(100%,470px);background:white;border:1px solid #dae3ea;border-radius:12px;padding:clamp(26px,5vw,42px);box-shadow:0 16px 44px rgba(20,49,77,.07)}
small{display:block;color:#a45337;font-weight:700;letter-spacing:.12em;font-size:11px}
h1{font-size:27px;line-height:1.26;margin:13px 0 18px}
p{font-size:14px;line-height:1.8;color:#4c5f72}
button{width:100%;margin:20px 0 15px;min-height:50px;cursor:pointer;border:none;border-radius:6px;background:#173f60;color:white;font-weight:700;font-size:14px}
button:hover{background:#11314b}button:focus-visible,a:focus-visible{outline:3px solid #e08a64;outline-offset:4px}
a{color:#173f60}footer{margin-top:22px;border-top:1px solid #e6edf2;padding-top:16px;color:#738493;font-size:12px}
</style></head>
<body><main>
<small>KHOA CÔNG NGHỆ THÔNG TIN · DNTU</small>
<h1>${heading}</h1>
<p>${message}</p>
<form method="POST" action="/auth/confirm">
<input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}">
<input type="hidden" name="type" value="${escapeHtml(type)}">
<input type="hidden" name="next" value="${escapeHtml(next)}">
<button type="submit">${action}</button></form>
<p>Liên kết xác minh có thời hạn và chỉ được dùng một lần. Nếu không thực hiện yêu cầu này, bạn có thể đóng trang.</p>
<footer>Hệ thống xét khen thưởng Đoàn – Hội Khoa Công nghệ thông tin, DNTU</footer>
</main></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { ...cleanHeaders(), "Content-Type": "text/html; charset=utf-8" },
  });
}

/** Consumes one-time OTP only after the user explicitly submits the form. */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const source = request.headers.get("origin");
  if (source && source !== origin) return invalidLink(origin);
  let body: FormData;
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096) return invalidLink(origin);
    body = await request.formData();
  } catch {
    return invalidLink(origin);
  }
  const tokenHash = String(body.get("token_hash") || "");
  const type = String(body.get("type") || "");
  if (!hasValidFields(tokenHash, type)) return invalidLink(origin, type);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return invalidLink(origin, type);

  const target = type === "recovery" ? "/reset-password" : safeNext(String(body.get("next") || "/"));
  const response = NextResponse.redirect(new URL(target, origin), 303);
  Object.entries(cleanHeaders()).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}
