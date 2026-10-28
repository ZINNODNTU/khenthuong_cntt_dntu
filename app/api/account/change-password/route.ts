import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePassword } from "@/lib/password-policy";
import { writeAudit } from "@/lib/audit";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  password: z.string().min(1).max(128),
  confirmPassword: z.string().min(1).max(128),
}).strict().superRefine((value, context) => {
  if (value.password !== value.confirmPassword) context.addIssue({
    code: "custom", path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp.",
  });
});
const noStore = { "Cache-Control": "private, no-store" };
function fail(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status, headers: noStore });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(env.appUrl()).origin) ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    return fail("INVALID_ORIGIN", "Nguồn yêu cầu không hợp lệ.", 403);
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return fail("UNAUTHORIZED", "Phiên đăng nhập không hợp lệ.", 401);
  let body: unknown;
  try { body = await request.json(); }
  catch { return fail("INVALID_INPUT", "Dữ liệu không hợp lệ.", 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("INVALID_INPUT", parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ.", 400);
  const policyError = validatePassword(parsed.data.password, { email: user.email });
  if (policyError) return fail("WEAK_PASSWORD", policyError, 400);

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email, password: parsed.data.currentPassword,
  });
  if (reauthError) {
    await writeAudit(supabase, user.id, "account.change_password_failed", "profile", user.id, {
      status: "failure", reason: "reauthentication_failed",
    });
    return fail("CURRENT_PASSWORD_INVALID", "Mật khẩu hiện tại không đúng.", 400);
  }
  const { error: passwordError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (passwordError) {
    await writeAudit(supabase, user.id, "account.change_password_failed", "profile", user.id, {
      status: "failure", reason: "provider_rejected",
    });
    return fail("PASSWORD_UPDATE_FAILED", "Không thể đổi mật khẩu.", 400);
  }

  // Password change has succeeded, so record it before any independent
  // administrator-only profile flag update can fail.
  const auditRecorded = await writeAudit(supabase, user.id, "account.change_password", "profile", user.id, {
    method: "current_password",
  });
  try {
    const { error } = await createAdminClient().from("profiles")
      .update({ must_change_password: false }).eq("id", user.id);
    if (error) throw error;
  } catch (error) {
    console.error("[password.profile_sync]", {
      code: error && typeof error === "object" && "code" in error ? String(error.code) : "configuration",
    });
    await writeAudit(supabase, user.id, "account.password_profile_sync_failed", "profile", user.id, {
      status: "failure",
    });
    return fail("PROFILE_SYNC_FAILED",
      "Mật khẩu đã được đổi nhưng chưa cập nhật được trạng thái tài khoản. Không sử dụng lại mật khẩu cũ; vui lòng liên hệ quản trị.", 503);
  }
  return NextResponse.json({ ok: true, auditRecorded }, { headers: noStore });
}
