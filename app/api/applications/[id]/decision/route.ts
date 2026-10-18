import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { decisionSchema } from "@/lib/validation";
import { validateCriteria } from "@/lib/criteria-rules";
import type { ApplicationCriterion } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Mã hồ sơ không hợp lệ." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles")
    .select("role,is_active,must_change_password").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || profile.must_change_password || !["admin", "reviewer"].includes(profile.role)) {
    return NextResponse.json({ error: "Không có quyền xét duyệt." }, { status: 403 });
  }

  const { data: application } = await supabase.from("applications")
    .select("application_type").eq("id", id).maybeSingle();
  if (application?.application_type !== "individual") {
    return NextResponse.json({ error: "Chỉ xét khen thưởng cá nhân Đoàn – Hội." }, { status: 409 });
  }
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dữ liệu kết luận không hợp lệ." }, { status: 400 });
  }
  const { status, comment } = parsed.data;

  // Immediate, friendly preflight for reviewer; the SQL RPC repeats the guard
  // under an application row lock, so simultaneous reviews cannot bypass it.
  if (status === "passed") {
    const [{ data: app, error: appError }, { data: criteria, error: criteriaError }] = await Promise.all([
      supabase.from("applications").select("application_type").eq("id", id).maybeSingle(),
      supabase.from("application_criteria").select("code,status,value_text,numeric_value,boolean_value").eq("application_id", id),
    ]);
    if (appError || criteriaError || !app) {
      return NextResponse.json({ error: "Không thể kiểm tra phiếu đánh giá của hồ sơ." }, { status: 400 });
    }
    const issues = validateCriteria((criteria || []) as ApplicationCriterion[], app.application_type, "pass");
    if (issues.length) return NextResponse.json({ error: issues.join(" ") }, { status: 422 });
  }

  const { data, error } = await supabase.rpc("record_application_decision", {
    p_application_id: id,
    p_decision: status,
    p_comment: comment,
  });
  if (error) {
    const reasons: Record<string, string> = {
      APPLICATION_NOT_REVIEWABLE: "Hồ sơ đã được xử lý hoặc không còn chờ xét duyệt.",
      APPLICATION_NOT_ASSIGNED: "Bạn phải nhận phụ trách hồ sơ trước khi kết luận.",
      CRITERIA_INCOMPLETE: "Hồ sơ chưa được khởi tạo đủ 9 tiêu chí.",
      CRITERIA_UNVERIFIED: "Cần giải quyết đầy đủ cả 9 tiêu chí trước khi kết luận ĐẠT.",
      REQUIRED_CRITERIA_NOT_ELIGIBLE: "C7–C9 chưa đáp ứng điều kiện bắt buộc.",
      REVIEW_REASON_REQUIRED: "Vui lòng ghi rõ lý do không đạt hoặc yêu cầu bổ sung.",
    };
    const key = Object.keys(reasons).find(item => error.message.includes(item));
    return NextResponse.json({
      error: key ? reasons[key] : "Không thể ghi kết luận. Vui lòng thử lại hoặc liên hệ quản trị viên.",
    }, { status: 409 });
  }
  return NextResponse.json({ ok: true, applicationId: data.id, status: data.status }, {
    headers: { "Cache-Control": "no-store" },
  });
}
