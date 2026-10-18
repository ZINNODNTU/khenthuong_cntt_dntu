import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClubSchema, updateClubSchema } from "@/lib/validation";
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
            error: NextResponse.json({ error: "Chỉ quản trị viên được quản lý CLB" }, { status: 403 }),
        };
    }
    return { supabase, user };
}
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth)
        return auth.error;
    const parsed = createClubSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const code = parsed.data.code.toUpperCase();
    const { data: club, error } = await auth.supabase
        .from("clubs")
        .insert({
        code,
        name: parsed.data.name,
        is_active: true,
    })
        .select()
        .single();
    if (error || !club) {
        return NextResponse.json({
            error: error?.code === "23505"
                ? "Mã CLB đã tồn tại"
                : "Không thể thêm CLB",
        }, { status: 400 });
    }
    await writeAudit(auth.supabase, auth.user.id, "club.create", "club", club.id, { code });
    return NextResponse.json({ club }, { status: 201 });
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
    const parsed = updateClubSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { id, code, name, isActive } = parsed.data;
    const { data: club, error } = await auth.supabase
        .from("clubs")
        .update({
        code: code.toUpperCase(),
        name,
        is_active: isActive,
    })
        .eq("id", id)
        .select()
        .single();
    if (error || !club) {
        return NextResponse.json({ error: "Không thể cập nhật CLB" }, { status: 400 });
    }
    await writeAudit(auth.supabase, auth.user.id, "club.update", "club", id, { isActive });
    return NextResponse.json({ club });
}

