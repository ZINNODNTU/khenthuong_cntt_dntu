import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({ id: z.uuid() });
const bodySchema = z.object({ action: z.enum(["claim", "release"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const path = paramsSchema.safeParse(await context.params);
  if (!path.success) return NextResponse.json({ error: "Mã hồ sơ không hợp lệ." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles")
    .select("role,is_active,must_change_password").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || profile.must_change_password || !["admin", "reviewer"].includes(profile.role)) {
    return NextResponse.json({ error: "Bạn không có quyền nhận xét duyệt." }, { status: 403 });
  }

  const { data: application } = await supabase.from("applications")
    .select("application_type").eq("id", path.data.id).maybeSingle();
  if (application?.application_type !== "individual") {
    return NextResponse.json({ error: "Chỉ phân công xét duyệt hồ sơ cá nhân." }, { status: 409 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Thao tác không hợp lệ." }, { status: 400 });
  const { data, error } = await supabase.rpc("assign_application_review", {
    p_application_id: path.data.id, p_action: parsed.data.action,
  });
  if (error) {
    const message = error.message.includes("ALREADY_ASSIGNED")
      ? "Hồ sơ đang được một cán bộ khác xử lý."
      : error.message.includes("NOT_ASSIGNED_TO_YOU")
      ? "Bạn chưa được phân công hồ sơ này."
      : error.message.includes("APPLICATION_NOT_REVIEWABLE")
      ? "Hồ sơ không còn ở trạng thái chờ xét duyệt."
      : "Không thể cập nhật người phụ trách. Kiểm tra migration quy trình xét duyệt.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
  return NextResponse.json({ application: { id: data.id, status: data.status, reviewer_id: data.reviewer_id } }, {
    headers: { "Cache-Control": "no-store" },
  });
}
