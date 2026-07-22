import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_UNIT_PASSWORD } from "@/lib/identity";
import { writeAudit } from "@/lib/audit";
const schema = z.object({
    password: z
        .string()
        .min(10, "Mật khẩu phải có ít nhất 10 ký tự.")
        .max(128)
        .regex(/[A-Za-z]/, "Mật khẩu phải có chữ.")
        .regex(/\d/, "Mật khẩu phải có số.")
        .refine((value) => value !== DEFAULT_UNIT_PASSWORD, "Không được tiếp tục dùng mật khẩu mặc định."),
});
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({
            error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        }, { status: 401 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { error: passwordError } = await supabase.auth.updateUser({
        password: parsed.data.password,
    });
    if (passwordError) {
        return NextResponse.json({
            error: passwordError.message ||
                "Không thể đổi mật khẩu",
        }, { status: 400 });
    }
    const admin = createAdminClient();
    const { error: profileError } = await admin
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", user.id);
    if (profileError) {
        return NextResponse.json({
            error: "Mật khẩu đã đổi nhưng không thể hoàn tất trạng thái tài khoản. Hãy liên hệ quản trị viên.",
        }, { status: 500 });
    }
    await writeAudit(supabase, user.id, "account.change_password", "profile", user.id, {});
    return NextResponse.json({ ok: true });
}

