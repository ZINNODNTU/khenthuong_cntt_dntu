export type EmailPurpose = "recovery" | "signup";

export async function requestAuthEmail(
  purpose: EmailPurpose,
  email: string,
): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  try {
    const response = await fetch("/api/auth/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, email }),
      credentials: "same-origin",
      cache: "no-store",
      // Allow server-side SMTP submission to complete without client abort.
      signal: AbortSignal.timeout(40000),
    });
    if (response.ok) return { ok: true };
    const body = await response.json().catch(() => ({})) as { code?: string; error?: string };
    if (body.code === "SUPABASE_PROJECT_MISMATCH") {
      return { ok: false, code: "SUPABASE_PROJECT_MISMATCH",
        message: "Cấu hình xác thực của website đang sai dự án Supabase. Vui lòng liên hệ quản trị để khắc phục." };
    }
    if (response.status === 429) {
      return { ok: false, code: "RATE_LIMITED",
        message: "Hệ thống đang giới hạn số lần gửi email. Vui lòng thử lại sau ít phút." };
    }
    if (response.status === 400 || response.status === 415) {
      return { ok: false, code: "INVALID_REQUEST",
        message: "MSSV hoặc địa chỉ email không hợp lệ." };
    }
    return { ok: false, code: String(body.code || "SERVICE_ERROR"),
      message: "Chưa xác nhận được kết quả gửi email. Hãy kiểm tra Hộp thư đến và Spam trước khi yêu cầu lại; nếu không thấy thư, liên hệ quản trị." };
  } catch {
    return { ok: false, code: "NETWORK_ERROR",
      message: "Không thể xác nhận yêu cầu đã hoàn tất. Email vẫn có thể đã được gửi; hãy kiểm tra hộp thư trước khi gửi lại." };
  }
}
