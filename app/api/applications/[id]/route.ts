import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
const schema = z.object({
    achievements: z.string().min(20).max(15000),
    summary: z.string().max(8000).optional().default(""),
    resubmit: z.boolean().default(false),
});
export async function PATCH(request: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { data: profile } = await supabase
        .from("profiles")
        .select("role,submission_scope,branch_code,club_id,is_active,must_change_password")
        .eq("id", user.id)
        .single();
    if (profile?.must_change_password) {
        return NextResponse.json({ error: "Bạn phải đổi mật khẩu trước khi cập nhật hồ sơ." }, { status: 403 });
    }
    if (!profile?.is_active || profile.role !== "submitter") {
        return NextResponse.json({ error: "Không có quyền cập nhật hồ sơ" }, { status: 403 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { data: app } = await supabase
        .from("applications")
        .select("id,created_by,status,application_type,collective_type,branch_code,club_id,evaluation_period_id")
        .eq("id", id)
        .single();
    const ownsScope = app?.application_type === "individual"
        ? profile.submission_scope === "individual" && app.branch_code === profile.branch_code
        : app?.collective_type === "branch"
            ? profile.submission_scope === "branch" && app.branch_code === profile.branch_code
            : profile.submission_scope === "club" && app?.club_id === profile.club_id;
    if (!app || app.created_by !== user.id || !ownsScope || !["draft", "revision"].includes(app.status)) {
        return NextResponse.json({ error: "Hồ sơ không được phép chỉnh sửa" }, { status: 403 });
    }
    if (parsed.data.resubmit) {
        const { data: period } = await supabase
            .from("evaluation_periods")
            .select("status,starts_at,ends_at")
            .eq("id", app.evaluation_period_id)
            .single();
        const now = Date.now();
        if (!period || period.status !== "open" || now < new Date(period.starts_at).getTime() || now > new Date(period.ends_at).getTime()) {
            return NextResponse.json({ error: "Đợt xét đã đóng hoặc chưa bắt đầu. Không thể gửi hồ sơ." }, { status: 400 });
        }
        const [evidenceResult, activityResult, awardResult] = await Promise.all([
            supabase.from("evidences").select("id,category,parent_type").eq("application_id", id),
            supabase.from("activities").select("name").eq("application_id", id),
            supabase.from("prior_awards").select("title,decision_number,issuer").eq("application_id", id),
        ]);
        if (evidenceResult.error || activityResult.error || awardResult.error) {
            return NextResponse.json({ error: "Không thể kiểm tra tính đầy đủ của hồ sơ" }, { status: 400 });
        }
        const evidences = evidenceResult.data || [];
        if (!evidences.length) {
            return NextResponse.json({ error: "Hồ sơ phải có ít nhất 01 ảnh minh chứng" }, { status: 400 });
        }
        if (app.application_type === "individual") {
            const hasPortrait = evidences.some((item) => item.parent_type === "application" && item.category === "portrait");
            if (!hasPortrait) {
                return NextResponse.json({ error: "Hồ sơ cá nhân phải có ảnh chân dung" }, { status: 400 });
            }
        }
        const invalidActivity = (activityResult.data || []).some((item) => item.name.trim().length < 3);
        if (invalidActivity) {
            return NextResponse.json({ error: "Có hoạt động chưa nhập tên hợp lệ" }, { status: 400 });
        }
        const invalidAward = (awardResult.data || []).some((item) => item.title.trim().length < 3 || !item.decision_number.trim() || item.issuer.trim().length < 2);
        if (invalidAward) {
            return NextResponse.json({ error: "Có thành tích khen thưởng chưa đủ tên, số quyết định/GCN hoặc đơn vị trao tặng" }, { status: 400 });
        }
    }
    const values: Record<string, unknown> = {
        achievements: parsed.data.achievements,
        summary: parsed.data.summary || null,
    };
    if (parsed.data.resubmit) {
        values.status = "submitted";
    }
    const { error } = await supabase.from("applications").update(values).eq("id", id);
    if (error) {
        const duplicate = error.message.toLowerCase().includes("đã có hồ sơ");
        return NextResponse.json({ error: duplicate ? "Đối tượng đã có một hồ sơ trong đợt xét này." : error.message }, { status: duplicate ? 409 : 400 });
    }
    await writeAudit(supabase, user.id, parsed.data.resubmit ? "application.submit" : "application.supplement", "application", id, {});
    return NextResponse.json({ ok: true });
}

