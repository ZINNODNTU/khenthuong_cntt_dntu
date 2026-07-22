import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSystemUserSchema, manageSystemUserSchema, } from "@/lib/validation";
import { env } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import { isStudentDntuEmail, studentIdFromDntuEmail } from "@/lib/identity";
import type { SubmissionScope, UserRole } from "@/lib/types";
async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user) {
        return {
            error: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }),
        };
    }
    const { data: profile } = await supabase
        .from("profiles")
        .select("role,is_active,must_change_password")
        .eq("id", user.id)
        .single();
    if (profile?.must_change_password) {
        return {
            error: NextResponse.json({ error: "Bạn phải đổi mật khẩu trước khi tiếp tục." }, { status: 403 }),
        };
    }
    if (!profile?.is_active || profile.role !== "admin") {
        return {
            error: NextResponse.json({
                error: "Chỉ quản trị viên được quản lý tài khoản",
            }, { status: 403 }),
        };
    }
    return { supabase, user };
}
function validDomain(email: string, role: UserRole) {
    return (role === "submitter" ||
        email.endsWith(`@${env.reviewerDomain()}`));
}
async function validateIndividualAccount(supabase: Awaited<ReturnType<typeof createClient>>, role: UserRole, scope: SubmissionScope, email: string, branchCode: string) {
    if (role !== "submitter")
        return null;
    if (scope !== "individual") {
        return "Tài khoản Chi đoàn và CLB phải được cấp tại trang quản lý đơn vị.";
    }
    if (!isStudentDntuEmail(email)) {
        return "Email sinh viên phải có dạng MSSV@dntu.edu.vn, trong đó MSSV chỉ gồm chữ số.";
    }
    if (!branchCode) {
        return "Tài khoản sinh viên phải được gán Chi đoàn.";
    }
    const { data } = await supabase
        .from("branches")
        .select("code")
        .eq("code", branchCode)
        .eq("is_active", true)
        .maybeSingle();
    if (!data) {
        return "Chi đoàn không tồn tại hoặc đã ngừng sử dụng.";
    }
    return null;
}
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth)
        return auth.error;
    const parsed = createSystemUserSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const payload = parsed.data;
    const email = payload.email.toLowerCase();
    if (!validDomain(email, payload.role)) {
        return NextResponse.json({
            error: `Tài khoản quản trị/xét duyệt phải dùng email @${env.reviewerDomain()}`,
        }, { status: 400 });
    }
    const accountError = await validateIndividualAccount(auth.supabase, payload.role, payload.submissionScope, email, payload.branchCode);
    if (accountError) {
        return NextResponse.json({ error: accountError }, { status: 400 });
    }
    const admin = createAdminClient();
    const studentId = payload.role === "submitter"
        ? studentIdFromDntuEmail(email)
        : null;
    if (studentId) {
        const { data: existingRegistry } = await admin
            .from("student_account_registry")
            .select("student_id")
            .eq("student_id", studentId)
            .maybeSingle();
        const { data: existingProfile } = await admin
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
        if (existingRegistry || existingProfile) {
            return NextResponse.json({
                error: "MSSV này đã có tài khoản.",
            }, { status: 409 });
        }
    }
    const { data, error } = await admin.auth.admin.createUser({
        email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
            full_name: payload.fullName,
            account_type: payload.role === "submitter"
                ? "student"
                : "staff",
        },
    });
    if (error || !data.user) {
        const duplicate = Boolean(error?.message
            ?.toLowerCase()
            .match(/already|duplicate|exists/));
        return NextResponse.json({
            error: duplicate
                ? "MSSV hoặc email này đã có tài khoản."
                : error?.message || "Không thể tạo tài khoản",
        }, { status: duplicate ? 409 : 400 });
    }
    const { error: profileError } = await admin
        .from("profiles")
        .upsert({
        id: data.user.id,
        email,
        full_name: payload.fullName,
        role: payload.role,
        submission_scope: "individual",
        branch_code: payload.role === "submitter"
            ? payload.branchCode
            : null,
        club_id: null,
        is_active: true,
        must_change_password: false,
    });
    if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        if (studentId) {
            await admin
                .from("student_account_registry")
                .delete()
                .eq("student_id", studentId)
                .is("auth_user_id", null);
        }
        return NextResponse.json({
            error: "Không thể lưu thông tin phân quyền tài khoản",
        }, { status: 400 });
    }
    await writeAudit(auth.supabase, auth.user.id, "user.create", "profile", data.user.id, {
        email,
        role: payload.role,
        submissionScope: "individual",
    });
    return NextResponse.json({ ok: true, userId: data.user.id }, { status: 201 });
}
export async function PATCH(request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth)
        return auth.error;
    const parsed = manageSystemUserSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({
            error: parsed.error.issues[0]?.message ||
                "Dữ liệu không hợp lệ",
        }, { status: 400 });
    }
    const payload = parsed.data;
    const admin = createAdminClient();
    if (payload.action === "reset_password") {
        const { error } = await admin.auth.admin.updateUserById(payload.userId, { password: payload.password });
        if (error) {
            return NextResponse.json({
                error: error.message ||
                    "Không thể đặt lại mật khẩu",
            }, { status: 400 });
        }
        await admin
            .from("profiles")
            .update({ must_change_password: true })
            .eq("id", payload.userId);
        await writeAudit(auth.supabase, auth.user.id, "user.reset_password", "profile", payload.userId, {});
        return NextResponse.json({ ok: true });
    }
    if (payload.action === "set_active") {
        if (payload.userId === auth.user.id &&
            !payload.isActive) {
            return NextResponse.json({
                error: "Không thể tự khóa tài khoản đang đăng nhập",
            }, { status: 400 });
        }
        const { error } = await admin
            .from("profiles")
            .update({ is_active: payload.isActive })
            .eq("id", payload.userId);
        if (error) {
            return NextResponse.json({
                error: "Không thể cập nhật trạng thái tài khoản",
            }, { status: 400 });
        }
        await writeAudit(auth.supabase, auth.user.id, "user.set_active", "profile", payload.userId, { isActive: payload.isActive });
        return NextResponse.json({ ok: true });
    }
    const { data: target } = await admin
        .from("profiles")
        .select("email")
        .eq("id", payload.userId)
        .single();
    if (!target) {
        return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
    }
    if (!validDomain(target.email.toLowerCase(), payload.role)) {
        return NextResponse.json({
            error: `Tài khoản quản trị/xét duyệt phải dùng email @${env.reviewerDomain()}`,
        }, { status: 400 });
    }
    const updateError = await validateIndividualAccount(auth.supabase, payload.role, payload.submissionScope, target.email.toLowerCase(), payload.branchCode);
    if (updateError) {
        return NextResponse.json({ error: updateError }, { status: 400 });
    }
    const { error } = await admin
        .from("profiles")
        .update({
        full_name: payload.fullName,
        role: payload.role,
        submission_scope: "individual",
        branch_code: payload.role === "submitter"
            ? payload.branchCode
            : null,
        club_id: null,
    })
        .eq("id", payload.userId);
    if (error) {
        return NextResponse.json({ error: "Không thể cập nhật tài khoản" }, { status: 400 });
    }
    await writeAudit(auth.supabase, auth.user.id, "user.update_profile", "profile", payload.userId, { role: payload.role });
    return NextResponse.json({ ok: true });
}

