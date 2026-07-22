import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createClubSchema, provisionClubAccountSchema, updateClubSchema, } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";
import { provisionUnitAccount, provisionUnitAccounts, setUnitAccountActive, } from "@/lib/unit-accounts";
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
    try {
        const account = await provisionUnitAccount({
            code,
            fullName: `CLB ${club.name}`,
            scope: "club",
            clubId: club.id,
        });
        await writeAudit(auth.supabase, auth.user.id, "club.create_with_account", "club", club.id, {
            code,
            accountEmail: account.email,
        });
        return NextResponse.json({ club, account }, { status: 201 });
    }
    catch (accountError) {
        const admin = createAdminClient();
        await admin.from("clubs").delete().eq("id", club.id);
        return NextResponse.json({
            error: accountError instanceof Error
                ? `Không thể cấp tài khoản CLB: ${accountError.message}`
                : "Không thể cấp tài khoản CLB",
        }, { status: 400 });
    }
}
export async function PUT(request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth)
        return auth.error;
    const parsed = provisionClubAccountSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    let query = auth.supabase
        .from("clubs")
        .select("id,code,name,is_active")
        .eq("is_active", true)
        .order("code");
    if (!parsed.data.allMissing && parsed.data.id) {
        query = query.eq("id", parsed.data.id);
    }
    const { data: clubs, error } = await query;
    if (error) {
        return NextResponse.json({ error: "Không thể tải danh sách CLB" }, { status: 400 });
    }
    let targets = clubs || [];
    if (parsed.data.allMissing && targets.length) {
        const { data: existingAccounts } = await auth.supabase
            .from("profiles")
            .select("club_id")
            .eq("role", "submitter")
            .eq("submission_scope", "club")
            .in("club_id", targets.map((club) => club.id));
        const existingIds = new Set((existingAccounts || [])
            .map((account) => account.club_id)
            .filter(Boolean));
        targets = targets.filter((club) => !existingIds.has(club.id));
    }
    let accounts;
    try {
        accounts = await provisionUnitAccounts(targets.map((club) => ({
            code: club.code,
            fullName: `CLB ${club.name}`,
            scope: "club" as const,
            clubId: club.id,
        })));
    }
    catch (accountError) {
        return NextResponse.json({
            error: accountError instanceof Error
                ? accountError.message
                : "Không thể cấp tài khoản CLB",
        }, { status: 400 });
    }
    await writeAudit(auth.supabase, auth.user.id, "club.provision_accounts", "club", null, {
        count: accounts.length,
        ids: targets.map((club) => club.id),
    });
    return NextResponse.json({ accounts });
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
    try {
        await setUnitAccountActive({
            scope: "club",
            clubId: id,
            isActive,
        });
    }
    catch {
        return NextResponse.json({
            error: "CLB đã cập nhật nhưng không thể đồng bộ trạng thái tài khoản.",
        }, { status: 500 });
    }
    await writeAudit(auth.supabase, auth.user.id, "club.update", "club", id, { isActive });
    return NextResponse.json({ club });
}

