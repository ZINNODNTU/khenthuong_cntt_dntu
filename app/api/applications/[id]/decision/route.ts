import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decisionSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";
export async function POST(request: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role,is_active,must_change_password").eq("id", user.id).single();
    if (profile?.must_change_password) {
        return NextResponse.json({ error: "Bạn phải đổi mật khẩu trước khi tiếp tục." }, { status: 403 });
    }
    if (!profile?.is_active || !["admin", "reviewer"].includes(profile.role)) {
        return NextResponse.json({ error: "Không có quyền xét duyệt" }, { status: 403 });
    }
    const parsed = decisionSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { status, comment } = parsed.data;
    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
        .from("applications")
        .update({ status, review_comment: comment || null, reviewer_id: user.id, decided_at: now })
        .eq("id", id)
        .in("status", ["submitted", "review"])
        .select("id")
        .maybeSingle();
    if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
    if (!updated) {
        return NextResponse.json({ error: "Hồ sơ đã được xử lý hoặc không còn ở trạng thái chờ xét duyệt" }, { status: 409 });
    }
    await supabase.from("review_history").insert({
        application_id: id,
        reviewer_id: user.id,
        decision: status,
        comment: comment || null,
    });
    await writeAudit(supabase, user.id, "application.decision", "application", id, { status });
    return NextResponse.json({ ok: true });
}

