import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBranchSchema, updateBranchSchema, deleteBranchSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
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
            error: NextResponse.json({ error: "Chỉ quản trị viên được quản lý chi đoàn" }, { status: 403 }),
        };
    }
    return { supabase, user };
}
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth)
        return auth.error;
    const parsed = createBranchSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const code = parsed.data.code.toUpperCase();
    const name = parsed.data.name || code;
    const { data: branch, error } = await auth.supabase
        .from("branches")
        .insert({
        code,
        name,
        is_active: true,
    })
        .select()
        .single();
    if (error || !branch) {
        return NextResponse.json({
            error: error?.code === "23505"
                ? "Mã chi đoàn đã tồn tại"
                : "Không thể thêm chi đoàn",
        }, { status: 400 });
    }
    await writeAudit(auth.supabase, auth.user.id, "branch.create", "branch", null, { code });
    return NextResponse.json({ branch }, { status: 201 });
}
// Historical collective account provisioning is intentionally disabled.
export async function PUT(_request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    return NextResponse.json({ error: "Hệ thống chỉ cấp tài khoản xét khen thưởng cá nhân." }, { status: 410 });
}
export async function PATCH(request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth)
        return auth.error;
    const parsed = updateBranchSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const code = parsed.data.code.toUpperCase();
    const newCode = parsed.data.newCode?.toUpperCase() || code;
    const { data: branch, error } = await auth.supabase
        .from("branches")
        .update({
        code: newCode,
        name: parsed.data.name || newCode,
        is_active: parsed.data.isActive,
    })
        .eq("code", code)
        .select()
        .maybeSingle();
    if (error || !branch) {
        const problem = error?.code === "23503" ? "Mã Chi đoàn đã được sử dụng trong tài khoản hoặc hồ sơ; chỉ có thể sửa tên và trạng thái."
            : error?.code === "23505" ? "Mã Chi đoàn mới đã tồn tại."
            : "Không thể cập nhật Chi đoàn.";
        return NextResponse.json({ error: problem }, { status: error?.code === "23503" ? 409 : 400 });
    }
    await writeAudit(auth.supabase, auth.user.id, "branch.update", "branch", null, {
        code, newCode,
        isActive: parsed.data.isActive,
    });
    return NextResponse.json({ branch });
}

/**
 * Physically delete only unused branches. PostgreSQL FKs protect historical
 * applicants and submissions, including references created concurrently.
 */
export async function DELETE(request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const parsed = deleteBranchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Mã Chi đoàn không hợp lệ." }, { status: 400 });
    const code = parsed.data.code.toUpperCase();
    const admin = createAdminClient();
    const [{ count: assigned, error: assignedError }, { count: applications, error: applicationsError }] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }).eq("branch_code", code),
        admin.from("applications").select("id", { count: "exact", head: true }).eq("branch_code", code),
    ]);
    if (assignedError || applicationsError) return NextResponse.json({ error: "Không thể xác minh ràng buộc Chi đoàn. Chưa xóa dữ liệu." }, { status: 503 });
    if ((assigned || 0) > 0 || (applications || 0) > 0) {
        return NextResponse.json({ error: "Không thể xóa Chi đoàn đã có tài khoản hoặc hồ sơ. Bạn có thể ngừng sử dụng để giữ nguyên lịch sử.", code: "BRANCH_IN_USE" }, { status: 409 });
    }
    const { data, error } = await admin.from("branches").delete().eq("code", code).select("code").maybeSingle();
    if (error) {
        return NextResponse.json({
            error: error.code === "23503"
                ? "Chi đoàn đang được dữ liệu khác tham chiếu. Chỉ có thể ngừng sử dụng."
                : "Không thể xóa Chi đoàn. Dữ liệu hiện có được giữ nguyên.",
        }, { status: error.code === "23503" ? 409 : 503 });
    }
    if (!data) return NextResponse.json({ error: "Không tìm thấy Chi đoàn cần xóa." }, { status: 404 });
    await writeAudit(auth.supabase, auth.user.id, "branch.delete", "branch", null, { code });
    return NextResponse.json({ ok: true });
}
