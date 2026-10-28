import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validatePassword } from "@/lib/password-policy";
import { writeAudit } from "@/lib/audit";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const schema = z.object({ password: z.string().min(12).max(128) }).strict();
const noStore = { "Cache-Control": "private, no-store" };

/** Complete an authenticated recovery flow server-side so the event can be
 * recorded reliably before the recovery session is cleared in the browser.
 * Supabase Auth independently requires a valid session for updateUser().
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(env.appUrl()).origin) ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403, headers: noStore });
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400, headers: noStore }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Mật khẩu cần có 12–128 ký tự." }, { status: 400, headers: noStore });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Liên kết hết hạn hoặc phiên xác thực không hợp lệ." }, { status: 401, headers: noStore });
  const policyError = validatePassword(parsed.data.password, { email: user.email });
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400, headers: noStore });
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    await writeAudit(supabase, user.id, "account.password_reset_failed", "profile", user.id, { result: "provider_rejected" });
    return NextResponse.json({ error: "Không thể cập nhật mật khẩu. Vui lòng yêu cầu liên kết mới." }, { status: 400, headers: noStore });
  }
  const auditRecorded = await writeAudit(supabase, user.id, "account.password_reset", "profile", user.id, { method: "email_recovery" });
  return NextResponse.json({ ok: true, auditRecorded }, { headers: noStore });
}
