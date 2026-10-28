import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { env } from "@/lib/env";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(env.appUrl()).origin) ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const { data: profile, error } = await supabase.from("profiles")
    .select("role,is_active,must_change_password").eq("id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Không thể xác minh quyền quản trị." }, { status: 503 });
  if (!profile?.is_active || profile.must_change_password || profile.role !== "admin") {
    return NextResponse.json({ error: "Chỉ quản trị viên mới được kiểm tra nhật ký." }, { status: 403 });
  }
  const { data: latest, error: queryError } = await supabase.from("audit_logs")
    .select("created_at")
    .eq("actor_id", user.id)
    .eq("action", "system.audit_health_check")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (queryError) {
    console.error("[audit.health.read_failed]", { code: queryError.code });
    return NextResponse.json({ error: "Không thể đọc nhật ký." }, { status: 503 });
  }
  if (latest && Date.now() - Date.parse(latest.created_at) < 60_000) {
    return NextResponse.json({ error: "Vừa kiểm tra gần đây. Vui lòng thử lại sau một phút." },
      { status: 429, headers: { "Retry-After": "60" } });
  }
  const recorded = await writeAudit(supabase, user.id, "system.audit_health_check", "system", null, {
    result: "insert_probe", source: "admin_audit_log",
  });
  if (!recorded) return NextResponse.json({ error: "Thử ghi nhật ký thất bại. Kiểm tra log máy chủ và quyền Supabase." }, { status: 503 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
