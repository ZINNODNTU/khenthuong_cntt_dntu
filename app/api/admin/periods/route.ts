import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPeriodSchema, updatePeriodSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";
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
    status: "draft" | "open" | "closed";
    allowIndividual: boolean;
    allowBranchCollective: boolean;
    allowClubCollective: boolean;
}) {
    return { name: p.name, description: p.description || null, starts_at: p.startsAt, ends_at: p.endsAt, status: p.status, allow_individual: p.allowIndividual, allow_branch_collective: p.allowBranchCollective, allow_club_collective: p.allowClubCollective };
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

