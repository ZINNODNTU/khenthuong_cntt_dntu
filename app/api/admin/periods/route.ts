import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPeriodSchema, updatePeriodSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return { error: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
    const { data: profile } = await supabase.from("profiles").select("role,is_active,must_change_password").eq("id", user.id).single();
    if (profile?.must_change_password)
        return { error: NextResponse.json({ error: "Bạn phải đổi mật khẩu trước khi tiếp tục." }, { status: 403 }) };
    if (!profile?.is_active || profile.role !== "admin")
        return { error: NextResponse.json({ error: "Chỉ quản trị viên được quản lý đợt xét" }, { status: 403 }) };
    return { supabase, user };
}
function values(p: {
    name: string;
    description: string;
    startsAt: string;
    endsAt: string;
    evidenceStartsOn: string;
    evidenceEndsOn: string;
    status: "draft" | "open" | "closed";
    allowIndividual: boolean;
    allowBranchCollective: boolean;
    allowClubCollective: boolean;
}) {
    return { name: p.name, description: p.description || null, starts_at: p.startsAt, ends_at: p.endsAt, evidence_starts_on: p.evidenceStartsOn, evidence_ends_on: p.evidenceEndsOn, status: p.status, allow_individual: p.allowIndividual, allow_branch_collective: p.allowBranchCollective, allow_club_collective: p.allowClubCollective };
}
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth)
        return auth.error;
    const parsed = createPeriodSchema.safeParse(await request.json());
    if (!parsed.success)
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const { data, error } = await auth.supabase.from("evaluation_periods").insert({ ...values(parsed.data), created_by: auth.user.id }).select().single();
    if (error)
        return NextResponse.json({ error: error.message || "Không thể tạo đợt xét" }, { status: 400 });
    await writeAudit(auth.supabase, auth.user.id, "period.create", "evaluation_period", data.id, { name: data.name });
    return NextResponse.json({ period: data }, { status: 201 });
}
export async function PATCH(request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth)
        return auth.error;
    const parsed = updatePeriodSchema.safeParse(await request.json());
    if (!parsed.success)
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const { id, ...payload } = parsed.data;
    const { data, error } = await auth.supabase.from("evaluation_periods").update(values(payload)).eq("id", id).select().single();
    if (error)
        return NextResponse.json({ error: error.message || "Không thể cập nhật đợt xét" }, { status: 400 });
    await writeAudit(auth.supabase, auth.user.id, "period.update", "evaluation_period", id, { status: data.status });
    return NextResponse.json({ period: data });
}

const deletePeriodSchema = z.object({ id: z.string().uuid(), confirmationName: z.string().min(1).max(200) });
export async function DELETE(request: Request) {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const parsed = deletePeriodSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Dữ liệu xác nhận không hợp lệ" }, { status: 400 });
    const { data: period } = await auth.supabase.from("evaluation_periods").select("id,name").eq("id", parsed.data.id).maybeSingle();
    if (!period) return NextResponse.json({ error: "Không tìm thấy đợt xét" }, { status: 404 });
    if (parsed.data.confirmationName.trim() !== period.name) return NextResponse.json({ error: `Nhập đúng tên “${period.name}” để xác nhận.` }, { status: 400 });
    const { count } = await auth.supabase.from("applications").select("id", { count: "exact", head: true }).eq("evaluation_period_id", period.id);
    if (count) return NextResponse.json({ error: `Đợt xét còn ${count} hồ sơ. Hãy xóa các hồ sơ trước.` }, { status: 409 });
    await writeAudit(auth.supabase, auth.user.id, "period.delete", "evaluation_period", period.id, { name: period.name });
    // Dùng service role để bypass RLS (thiếu policy delete trên bảng)
    const admin = createAdminClient();
    const { error, data: deleted } = await admin.from("evaluation_periods").delete().eq("id", period.id).select("id");
    if (error) return NextResponse.json({ error: error.message || "Không thể xóa đợt xét" }, { status: 400 });
    if (!deleted || deleted.length === 0) return NextResponse.json({ error: "Xóa không thành công." }, { status: 500 });
    return NextResponse.json({ ok: true });
}
