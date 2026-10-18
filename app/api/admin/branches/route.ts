import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBranchSchema, updateBranchSchema } from "@/lib/validation";
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
    const { data: branch, error } = await auth.supabase
        .from("branches")
        .update({
        name: parsed.data.name || code,
        is_active: parsed.data.isActive,
    })
        .eq("code", code)
        .select()
        .single();
    if (error || !branch) {
        return NextResponse.json({ error: "Không thể cập nhật chi đoàn" }, { status: 400 });
    }
    await writeAudit(auth.supabase, auth.user.id, "branch.update", "branch", null, {
        code,
        isActive: parsed.data.isActive,
    });
    return NextResponse.json({ branch });
}

