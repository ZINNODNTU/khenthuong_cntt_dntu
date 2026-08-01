import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePassword } from "@/lib/password-policy";
import { writeAudit } from "@/lib/audit";
const schema = z.object({
    currentPassword: z.string().min(1).max(128),
    password: z.string().min(1).max(128),
    confirmPassword: z.string().min(1).max(128),
}).superRefine((value, context) => {
    if (value.password !== value.confirmPassword) context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp." });
});
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Phiên đăng nhập không hợp lệ." } }, { status: 401 });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Dữ liệu không hợp lệ." } }, { status: 400 }); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." } }, { status: 400 });
    const policyError = validatePassword(parsed.data.password, { email: user.email });
    if (policyError) return NextResponse.json({ error: { code: "WEAK_PASSWORD", message: policyError } }, { status: 400 });
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email!, password: parsed.data.currentPassword });
    if (reauthError) {
        await writeAudit(supabase, user.id, "account.change_password_failed", "profile", user.id, { reason: "reauthentication_failed" });
        return NextResponse.json({ error: { code: "CURRENT_PASSWORD_INVALID", message: "Mật khẩu hiện tại không đúng." } }, { status: 400 });
    }
    const { error: passwordError } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (passwordError) return NextResponse.json({ error: { code: "PASSWORD_UPDATE_FAILED", message: "Không thể đổi mật khẩu." } }, { status: 400 });
    const admin = createAdminClient();
    const { error: profileError } = await admin.from("profiles").update({ must_change_password: false }).eq("id", user.id);
    if (profileError) return NextResponse.json({ error: { code: "ACCOUNT_UPDATE_FAILED", message: "Không thể hoàn tất trạng thái tài khoản." } }, { status: 500 });
    await writeAudit(supabase, user.id, "account.change_password", "profile", user.id, {});
    return NextResponse.json({ ok: true });
}

