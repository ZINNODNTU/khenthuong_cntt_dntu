import { rateLimitBucket, requestClientAddress } from "@/lib/security-primitives";
export { requestClientAddress };
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; response: NextResponse };

export async function enforceRateLimit(
  scope: string,
  identity: string,
  maxHits: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const bucket = rateLimitBucket(scope, identity, env.supabaseServiceRoleKey());
    const { data, error } = await createAdminClient().rpc("consume_security_rate_limit", {
      p_bucket: bucket,
      p_max_hits: maxHits,
      p_window_seconds: windowSeconds,
    });
    if (error || !Array.isArray(data) || data.length !== 1) {
      console.error("[security.rate_limit.unavailable]", { scope, code: error?.code });
      return { allowed: false, response: NextResponse.json(
        { error: "Bộ bảo vệ tần suất đang không khả dụng. Vui lòng liên hệ quản trị." },
        { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
      ) };
    }
    if (data[0].allowed !== true) {
      const seconds = Math.max(1, Math.min(86400, Number(data[0].retry_after_seconds) || 60));
      return { allowed: false, response: NextResponse.json(
        { error: "Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau." },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(seconds) } }
      ) };
    }
    return { allowed: true };
  } catch (error) {
    console.error("[security.rate_limit.failed]", { scope, reason: error instanceof Error ? error.name : "unknown" });
    return { allowed: false, response: NextResponse.json(
      { error: "Không thể kiểm tra giới hạn yêu cầu." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
    ) };
  }
}
