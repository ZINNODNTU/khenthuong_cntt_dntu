import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
/** Best-effort authenticated login receipt. The password stays in Supabase Auth:
 * this route never accepts credentials, user IDs, emails or action names.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(env.appUrl()).origin) ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  // Only log immediately after a fresh Supabase sign-in, not on arbitrary page visits.
  const last = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : NaN;
  if (!Number.isFinite(last) || Math.abs(Date.now() - last) > 120_000) {
    return NextResponse.json({ ok: true, recorded: false }, { headers: { "Cache-Control": "no-store" } });
  }
  const recorded = await writeAudit(supabase, user.id, "auth.login_success", "profile", user.id, { method: "password" });
  return NextResponse.json({ ok: true, recorded }, { headers: { "Cache-Control": "no-store" } });
}
