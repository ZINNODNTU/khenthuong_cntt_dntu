import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(env.appUrl()).origin) ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await writeAudit(supabase, user.id, "account.logout", "profile", user.id, {});
  const { error } = await supabase.auth.signOut();
  if (error) return NextResponse.json({ error: "Không thể kết thúc phiên đăng nhập." }, { status: 503 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
