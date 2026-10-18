import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { EVIDENCE_CODES } from "@/lib/criterion-evidence";
import { enforceRateLimit } from "@/lib/security-rate-limit";

const upsertSchema = z.object({
  applicationId: z.uuid(),
  entryId: z.uuid(),
  criterion: z.enum(EVIDENCE_CODES),
  title: z.string().trim().min(3, "Tên thông tin minh chứng phải có ít nhất 3 ký tự.").max(240),
  description: z.string().trim().max(2000).default(""),
});
const removeSchema = z.object({ applicationId: z.uuid(), entryId: z.uuid() });

async function authorize(applicationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles")
    .select("role,is_active,must_change_password").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || profile.must_change_password || profile.role !== "submitter") {
    return { supabase, error: NextResponse.json({ error: "Không có quyền sửa minh chứng." }, { status: 403 }) };
  }
  const { data: app } = await supabase.from("applications")
    .select("id,created_by,status,application_type").eq("id", applicationId).maybeSingle();
  if (!app || app.created_by !== user.id || !["draft", "revision"].includes(app.status)) {
    return { supabase, error: NextResponse.json({ error: "Hồ sơ không được phép chỉnh sửa." }, { status: 403 }) };
  }
  if (app.application_type !== "individual") {
    return { supabase, error: NextResponse.json({ error: "Hồ sơ tập thể đã ngừng tiếp nhận chỉnh sửa." }, { status: 410 }) };
  }
  return { supabase, user, app };
}

export async function POST(request: Request) {
  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." }, { status: 400 });
  const { applicationId, entryId, criterion, title, description } = parsed.data;
  const auth = await authorize(applicationId);
  if (auth.error) return auth.error;
  const { data: applicable } = await auth.supabase.from("application_criteria")
    .select("code").eq("application_id", applicationId);
  if (!applicable?.some(row => row.code === criterion)) {
    return NextResponse.json({ error: "Tiêu chí không thuộc bộ tiêu chí của hồ sơ." }, { status: 400 });
  }
  const limit = await enforceRateLimit("evidence-entry:user", auth.user!.id, 180, 3600);
  if (!limit.allowed) return limit.response;
  const { data: previous, error: previousError } = await auth.supabase.from("evidence_entries")
    .select("id,application_id,criterion_code").eq("id", entryId).maybeSingle();
  if (previousError) return NextResponse.json({ error: "Chưa cài đặt bảng thông tin minh chứng. Cần áp dụng migration mới." }, { status: 503 });
  if (previous && (previous.application_id !== applicationId || previous.criterion_code !== criterion)) {
    return NextResponse.json({ error: "Mục minh chứng không thuộc tiêu chí này." }, { status: 409 });
  }
  const { data, error } = await auth.supabase.from("evidence_entries")
    .upsert({ id: entryId, application_id: applicationId, criterion_code: criterion,
      title, description, created_by: auth.user!.id }, { onConflict: "id" })
    .select("id,application_id,criterion_code,title,description,created_at").single();
  if (error || !data) {
    return NextResponse.json({ error: error?.code === "23505"
      ? "C7–C9 chỉ được khai một mục thông tin cho mỗi tiêu chí."
      : "Không thể lưu thông tin minh chứng. Vui lòng kiểm tra cấu hình cơ sở dữ liệu." }, { status: 409 });
  }
  await writeAudit(auth.supabase, auth.user!.id, previous ? "evidence_entry.update" : "evidence_entry.create", "evidence_entry", data.id, { applicationId, criterion });
  return NextResponse.json({ entry: data }, { status: previous ? 200 : 201 });
}

export async function DELETE(request: Request) {
  const parsed = removeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Thông tin xóa không hợp lệ." }, { status: 400 });
  const { applicationId, entryId } = parsed.data;
  const auth = await authorize(applicationId);
  if (auth.error) return auth.error;
  const { count, error: checkError } = await auth.supabase.from("evidences")
    .select("id", { count: "exact", head: true }).eq("application_id", applicationId).eq("evidence_entry_id", entryId);
  if (checkError) return NextResponse.json({ error: "Không thể kiểm tra tệp minh chứng." }, { status: 503 });
  if (count) return NextResponse.json({ error: "Hãy xóa các tệp trong mục trước khi xóa thông tin." }, { status: 409 });
  const { data, error } = await auth.supabase.from("evidence_entries")
    .delete().eq("id", entryId).eq("application_id", applicationId).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Không tìm thấy hoặc không thể xóa mục minh chứng." }, { status: 404 });
  await writeAudit(auth.supabase, auth.user!.id, "evidence_entry.delete", "evidence_entry", entryId, { applicationId });
  return NextResponse.json({ ok: true });
}
