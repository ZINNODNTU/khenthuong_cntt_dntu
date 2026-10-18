import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studentProfileSchema } from "@/lib/student-onboarding";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (!user.email_confirmed_at) return NextResponse.json({ error: "Bạn cần xác nhận email trường trước." }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const parsed = studentProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Thông tin không hợp lệ." }, { status: 400 });
  }
  const { data: profile } = await supabase.from("profiles")
    .select("role,submission_scope,is_active")
    .eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "submitter" || profile.submission_scope !== "individual" || !profile.is_active) {
    return NextResponse.json({ error: "Chỉ tài khoản sinh viên đang hoạt động mới được cập nhật hồ sơ." }, { status: 403 });
  }
  const { error } = await supabase.rpc("complete_student_profile", {
    p_full_name: parsed.data.fullName,
    p_branch_code: parsed.data.branchCode,
    p_phone: parsed.data.phone,
    p_birth_date: parsed.data.birthDate,
  });
  if (error) return NextResponse.json({ error: "Không thể lưu hồ sơ cá nhân. Vui lòng kiểm tra Chi đoàn và thông tin đã nhập." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
