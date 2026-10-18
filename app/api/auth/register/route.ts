import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { studentRegistrationSchema } from "@/lib/student-onboarding";
import { enforceRateLimit, requestClientAddress } from "@/lib/security-rate-limit";

export const dynamic = "force-dynamic";

function respond(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!env.publicSignupEnabled()) {
    return respond({ error: "Hệ thống hiện chưa mở đăng ký tự phục vụ." }, 403);
  }
  const ipLimit = await enforceRateLimit("register:ip", requestClientAddress(request), 12, 3600);
  if (!ipLimit.allowed) return ipLimit.response;
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return respond({ error: "Dữ liệu gửi lên không hợp lệ." }, 400);
  }
  const parsed = studentRegistrationSchema.safeParse(value);
  if (!parsed.success) {
    return respond({ error: parsed.error.issues[0]?.message || "Dữ liệu đăng ký không hợp lệ." }, 400);
  }
  const payload = parsed.data;
  const emailLimit = await enforceRateLimit("register:email", payload.email, 3, 3600);
  if (!emailLimit.allowed) return emailLimit.response;

  // Only public Supabase auth is used: never a service role / privileged key
  // in self-registration. The PostgreSQL trigger validates branch membership,
  // student-email format and ensures uniqueness atomically.
  const auth = createSupabaseClient(env.supabaseUrl(), env.supabasePublishableKey(), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: branch, error: branchError } = await auth.from("branches")
    .select("code")
    .eq("code", payload.branchCode)
    .eq("is_active", true)
    .maybeSingle();
  if (branchError || !branch) {
    return respond({ error: "Chi đoàn không tồn tại hoặc đã ngừng sử dụng." }, 400);
  }

  const confirmationUrl = new URL("/auth/finish", env.appUrl()).toString();
  const { data, error } = await auth.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      emailRedirectTo: confirmationUrl,
      data: {
        full_name: payload.fullName,
        branch_code: payload.branchCode,
        phone: payload.phone,
        birth_date: payload.birthDate,
        account_type: "student",
      },
    },
  });

  const duplicate = data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
  if (error || !data.user || duplicate) {
    const msg = error?.message?.toLowerCase() || "";
    if (duplicate || /already|duplicate|exists/i.test(msg)) {
      return respond({ error: "Email này đã có tài khoản. Hãy đăng nhập hoặc liên hệ quản trị." }, 409);
    }
    if (/rate limit|too many|over_email_send_rate_limit/i.test(msg)) {
      return respond({ error: "Dịch vụ email đang giới hạn tần suất gửi. Vui lòng thử lại sau." }, 429);
    }
    if (/branch|chi đoàn|inactive|student_account/i.test(msg)) {
      return respond({ error: "Email sinh viên hoặc Chi đoàn không hợp lệ, hoặc đã có tài khoản." }, 400);
    }
    return respond({ error: "Không tạo được tài khoản. Hãy kiểm tra thông tin và thử lại." }, 400);
  }

  // Fail closed in case an administrator accidentally disables email confirmation.
  if (data.user.email_confirmed_at || data.session) {
    return respond({
      error: "Supabase đang tắt xác nhận email. Quản trị viên phải bật Confirm email trước khi mở đăng ký.",
    }, 503);
  }
  return respond({ ok: true, requiresConfirmation: true, email: payload.email }, 201);
}
