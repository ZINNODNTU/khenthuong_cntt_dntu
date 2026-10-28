import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studentProfileSchema } from "@/lib/student-onboarding";
import { writeAudit } from "@/lib/audit";
import { profileUpdateCooldown } from "@/lib/profile-update-throttle";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// Only the active student may update their own basic information. ID, role,
// email, and account activation are intentionally not part of this payload.
export async function PATCH(request: Request) {
  // Prevent cross-site form/JavaScript submissions while preserving same-origin usage.
  const publicOrigin = new URL(env.appUrl()).origin;
  const sentOrigin = request.headers.get("origin");
  if ((sentOrigin && sentOrigin !== publicOrigin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  if (!user.email_confirmed_at) return NextResponse.json({ error: "Bạn cần xác minh email DNTU." }, { status: 403 });

  const { data: profile, error: lookupError } = await supabase.from("profiles")
    .select("role,submission_scope,is_active,must_change_password,branch_code,full_name,phone,birth_date,updated_at")
    .eq("id", user.id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Không thể kiểm tra tài khoản." }, { status: 503 });
  if (!profile || !profile.is_active || profile.must_change_password ||
      profile.role !== "submitter" || profile.submission_scope !== "individual") {
    return NextResponse.json({ error: "Tài khoản không được phép chỉnh sửa hồ sơ sinh viên." }, { status: 403 });
  }

  // Profile-only cooldown is scoped to the authenticated user and persisted
  // in PostgreSQL by the profile update trigger. No admin key dependency.
  const retryAfter = profileUpdateCooldown(profile.updated_at);
  if (retryAfter) return NextResponse.json(
    { error: `Thông tin vừa được cập nhật. Vui lòng thử lại sau ${retryAfter} giây.` },
    { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "private, no-store" } },
  );
  let json: unknown;
  try { json = await request.json(); }
  catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const parsed = studentProfileSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Vui lòng kiểm tra thông tin." }, { status: 400 });

  const requested = parsed.data;
  const { data: branch, error: branchError } = await supabase.from("branches")
    .select("code").eq("code", requested.branchCode).eq("is_active", true).maybeSingle();
  if (branchError) return NextResponse.json({ error: "Không thể kiểm tra danh mục Chi đoàn." }, { status: 503 });
  if (!branch) return NextResponse.json({ error: "Chi đoàn không còn hoạt động. Hãy chọn Chi đoàn trong danh sách." }, { status: 400 });

  // Changing branch while a dossier is being processed would orphan it:
  // application edit permissions are scoped to the branch recorded at creation.
  if (profile.branch_code !== requested.branchCode) {
    const { count, error } = await supabase.from("applications")
      .select("id", { head: true, count: "exact" })
      .eq("created_by", user.id)
      .in("status", ["draft", "revision", "submitted", "review"]);
    if (error) return NextResponse.json({ error: "Không thể kiểm tra các hồ sơ hiện tại." }, { status: 503 });
    if ((count || 0) > 0) return NextResponse.json({
      error: "Không thể đổi Chi đoàn khi bạn còn hồ sơ nháp hoặc đang xét duyệt. Vui lòng liên hệ quản trị viên để điều chỉnh đơn vị hồ sơ trước.",
    }, { status: 409 });
  }

  // SECURITY DEFINER RPC validates auth.uid(), authenticated DNTU email,
  // active status and allowed branch again within PostgreSQL.
  const { error } = await supabase.rpc("complete_student_profile", {
    p_full_name: requested.fullName,
    p_birth_date: requested.birthDate,
    p_phone: requested.phone,
    p_branch_code: requested.branchCode,
  });
  if (error) return NextResponse.json({ error: "Không thể lưu thông tin. Vui lòng kiểm tra Chi đoàn và thử lại." }, { status: 400 });
  await writeAudit(supabase, user.id, "profile.update_self", "profile", user.id, {
    branchChanged: profile.branch_code !== requested.branchCode,
  });
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
