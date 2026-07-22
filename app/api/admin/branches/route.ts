import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createBranchSchema, provisionBranchAccountSchema, updateBranchSchema, } from "@/lib/validation";
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
    try {
        const account = await provisionUnitAccount({
            code,
            fullName: `Chi đoàn ${name}`,
            scope: "branch",
            branchCode: code,
        });
        await writeAudit(auth.supabase, auth.user.id, "branch.create_with_account", "branch", null, {
            code,
            accountEmail: account.email,
        });
        return NextResponse.json({ branch, account }, { status: 201 });
    }
    catch (accountError) {
        const admin = createAdminClient();
        await admin.from("branches").delete().eq("code", code);
        return NextResponse.json({
            error: accountError instanceof Error
                ? `Không thể cấp tài khoản Chi đoàn: ${accountError.message}`
                : "Không thể cấp tài khoản Chi đoàn",
        }, { status: 400 });
    }
}
export async function PUT(request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth)
        return auth.error;
    const parsed = provisionBranchAccountSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    let query = auth.supabase
        .from("branches")
        .select("code,name,is_active")
        .eq("is_active", true)
        .order("code");
    if (!parsed.data.allMissing && parsed.data.code) {
        query = query.eq("code", parsed.data.code.toUpperCase());
    }
    const { data: branches, error } = await query;
    if (error) {
        return NextResponse.json({ error: "Không thể tải danh sách chi đoàn" }, { status: 400 });
    }
    let targets = branches || [];
    if (parsed.data.allMissing && targets.length) {
        const { data: existingAccounts } = await auth.supabase
            .from("profiles")
            .select("branch_code")
            .eq("role", "submitter")
            .eq("submission_scope", "branch")
            .in("branch_code", targets.map((branch) => branch.code));
        const existingCodes = new Set((existingAccounts || [])
            .map((account) => account.branch_code)
            .filter(Boolean));
        targets = targets.filter((branch) => !existingCodes.has(branch.code));
    }
    let accounts;
    try {
        accounts = await provisionUnitAccounts(targets.map((branch) => ({
            code: branch.code,
            fullName: `Chi đoàn ${branch.name}`,
            scope: "branch" as const,
            branchCode: branch.code,
        })));
    }
    catch (accountError) {
        return NextResponse.json({
            error: accountError instanceof Error
                ? accountError.message
                : "Không thể cấp tài khoản Chi đoàn",
        }, { status: 400 });
    }
    await writeAudit(auth.supabase, auth.user.id, "branch.provision_accounts", "branch", null, {
        count: accounts.length,
        codes: targets.map((branch) => branch.code),
    });
    return NextResponse.json({ accounts });
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
    try {
        await setUnitAccountActive({
            scope: "branch",
            branchCode: code,
            isActive: parsed.data.isActive,
        });
    }
    catch {
        return NextResponse.json({
            error: "Chi đoàn đã cập nhật nhưng không thể đồng bộ trạng thái tài khoản.",
        }, { status: 500 });
    }
    await writeAudit(auth.supabase, auth.user.id, "branch.update", "branch", null, {
        code,
        isActive: parsed.data.isActive,
    });
    return NextResponse.json({ branch });
}

