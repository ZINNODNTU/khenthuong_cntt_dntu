import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { EVIDENCE_CODES } from "@/lib/criterion-evidence";

const bodySchema = z.object({
  code: z.enum(EVIDENCE_CODES),
  status: z.enum(["pending", "verified", "rejected"]),
  reviewerNote: z.string().trim().max(3000).default(""),
}).superRefine((value, ctx) => {
  if (value.status === "rejected" && value.reviewerNote.length < 5) {
    ctx.addIssue({ code: "custom", path: ["reviewerNote"], message: "Cần ghi rõ lý do (ít nhất 5 ký tự)." });
  }
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Mã hồ sơ không hợp lệ." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles")
    .select("role,is_active,must_change_password").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || profile.must_change_password || !["admin","reviewer"].includes(profile.role)) {
    return NextResponse.json({ error: "Không có quyền xét tiêu chí." }, { status: 403 });
  }

  const { data: application } = await supabase.from("applications")
    .select("application_type").eq("id", id).maybeSingle();
  if (application?.application_type !== "individual") {
    return NextResponse.json({ error: "Chỉ xét tiêu chí của hồ sơ cá nhân." }, { status: 409 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." }, { status: 400 });
  const { data, error } = await supabase.rpc("review_assigned_criterion", {
    p_application_id: id,
    p_code: parsed.data.code,
    p_status: parsed.data.status,
    p_reviewer_note: parsed.data.reviewerNote,
  });
  if (error) {
    const messages: Record<string, string> = {
      APPLICATION_NOT_ASSIGNED: "Hãy nhận xử lý hồ sơ trước khi xét tiêu chí.",
      APPLICATION_NOT_REVIEWABLE: "Hồ sơ không còn trong trạng thái được xét duyệt.",
      CRITERION_EVIDENCE_MISSING: "Tiêu chí chưa có minh chứng tải lên Google Drive.",
      DISCIPLINARY_COMMITMENT_REQUIRED: "C9: Chưa có cam kết của sinh viên.",
      BINARY_REVIEW_ONLY: "Chỉ được xét Đạt hoặc Không đạt.",
      CRITERION_NOT_FOUND: "Tiêu chí chưa được khởi tạo. Hãy liên hệ quản trị viên.",
    };
    const code = Object.keys(messages).find(key => error.message.includes(key));
    return NextResponse.json({ error: code ? messages[code] : "Không thể lưu kết quả xét tiêu chí. Kiểm tra kết nối và phiên bản database." }, { status: 409 });
  }
  return NextResponse.json({ criterion: data }, { headers: { "Cache-Control": "no-store" } });
}
