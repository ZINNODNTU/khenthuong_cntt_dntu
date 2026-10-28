import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const types = new Set<EmailOtpType>(["email", "recovery", "invite", "magiclink", "email_change"]);

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") ||
      value.includes("\\") || /[\r\n]/.test(value)) return "/";
  return value;
}
function validToken(hash: string, type: string): type is EmailOtpType {
  return /^[A-Za-z0-9_-]{12,256}$/.test(hash) && types.has(type as EmailOtpType);
}
function headers() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
}
function invalidLink(origin: string, type?: string, reason = "invalid_link") {
  const url = new URL("/auth/finish", origin);
  url.searchParams.set("error", reason);
  if (type === "email") url.searchParams.set("flow", "signup");
  const response = NextResponse.redirect(url, 303);
  Object.entries(headers()).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/**
 * Mail scanners can GET a link without user intent. Do not consume the OTP
 * until the user presses the explicit POST confirmation button.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const hash = url.searchParams.get("token_hash") || "";
  const type = url.searchParams.get("type") || "";
  if (!validToken(hash, type)) return invalidLink(url.origin, type);
  const recovery = type === "recovery";
  const title = recovery ? "Xác nhận đặt lại mật khẩu" : "Xác nhận email tài khoản";
  const text = recovery
    ? "Nhấn nút bên dưới để xác minh liên kết và mở trang thiết lập mật khẩu mới."
    : "Nhấn nút bên dưới để xác nhận email của tài khoản xét khen thưởng.";
  const action = recovery ? "Tiếp tục đặt lại mật khẩu" : "Xác nhận và tiếp tục";
  const next = recovery ? "/reset-password" : safeNext(url.searchParams.get("next"));
  const page = `<!doctype html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | CNTT DNTU</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#eff4fa;color:#173751;font-family:Arial,Helvetica,sans-serif}
main{width:min(100%,470px);background:#fff;border:1px solid #dae3ea;border-radius:15px;padding:clamp(26px,5vw,42px);box-shadow:0 16px 44px rgba(20,49,77,.07)}
small{display:block;color:#a45337;font-weight:700;letter-spacing:.1em;font-size:11px}
h1{font-size:27px;line-height:1.26;margin:13px 0 18px}p{font-size:14px;line-height:1.8;color:#4c5f72}
button{width:100%;margin:20px 0 15px;min-height:50px;cursor:pointer;border:0;border-radius:7px;background:#173f60;color:white;font-weight:700;font-size:14px}
button:hover{background:#11314b}button:focus-visible,a:focus-visible{outline:3px solid #e08a64;outline-offset:4px}
footer{margin-top:22px;border-top:1px solid #e6edf2;padding-top:16px;color:#738493;font-size:12px}
</style></head><body><main>
<small>KHOA CÔNG NGHỆ THÔNG TIN · DNTU</small>
<h1>${title}</h1><p>${text}</p>
<form method="POST" action="/auth/confirm">
<input type="hidden" name="token_hash" value="${escapeHtml(hash)}">
<input type="hidden" name="type" value="${escapeHtml(type)}">
<input type="hidden" name="next" value="${escapeHtml(next)}">
<button type="submit">${action}</button></form>
<p>Vì bảo mật, chỉ sử dụng liên kết trong email mới nhất. Nếu đã yêu cầu nhiều email, các liên kết cũ có thể không còn hiệu lực.</p>
<footer>Hệ thống xét khen thưởng Đoàn – Hội Khoa CNTT, DNTU</footer>
</main></body></html>`;
  return new Response(page, { status: 200, headers: { ...headers(), "Content-Type": "text/html; charset=utf-8" } });
}

/**
 * Bind Supabase's session cookies to the ACTUAL 303 redirect response.
 * Using cookies() followed by a newly constructed redirect may fail to
 * propagate the exchanged session in some Next.js/serverless configurations.
 */
export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const source = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((source && source !== origin) || fetchSite === "cross-site") return invalidLink(origin);

  let form: FormData;
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096) return invalidLink(origin);
    form = await request.formData();
  } catch {
    return invalidLink(origin);
  }
  const hash = String(form.get("token_hash") || "");
  const type = String(form.get("type") || "");
  if (!validToken(hash, type)) return invalidLink(origin, type);

  const next = type === "recovery" ? "/reset-password" : safeNext(String(form.get("next") || "/"));
  const response = NextResponse.redirect(new URL(next, origin), 303);
  Object.entries(headers()).forEach(([name, value]) => response.headers.set(name, value));

  const client = createServerClient(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try {
    const { data, error } = await client.auth.verifyOtp({ token_hash: hash, type });
    if (error || !data.session) {
      // Only error category/status, never the token, email or full provider response.
      const category = error?.code === "otp_expired" ? "expired" : "invalid";
      console.warn("[auth.confirm]", { status: error?.status ?? 400, category, type });
      return invalidLink(origin, type, category === "expired" ? "expired_link" : "invalid_link");
    }
    return response;
  } catch (error) {
    console.error("[auth.confirm]", { category: "network", name: error instanceof Error ? error.name : "unknown" });
    return invalidLink(origin, type, "verification_unavailable");
  }
}
