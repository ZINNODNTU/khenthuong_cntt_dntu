import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// CLB administration has been retired. Keep historical club records for
// audit/review, but do not allow mutation through legacy API endpoints.
async function retired() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles")
    .select("role,is_active,must_change_password").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || profile.must_change_password || profile.role !== "admin") {
    return NextResponse.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
  }
  return NextResponse.json({
    error: "Chức năng quản lý CLB đã ngừng sử dụng. Hệ thống chỉ xét khen thưởng cá nhân.",
  }, { status: 410 });
}
export const POST = retired;
export const PUT = retired;
export const PATCH = retired;
export const DELETE = retired;
