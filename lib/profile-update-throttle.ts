/**
 * Small, account-scoped cooldown for self-profile updates.
 *
 * Uses the row's PostgreSQL-updated timestamp, not per-instance memory
 * (which is unreliable on serverless deployments). This endpoint may only
 * edit the caller's own authenticated profile, so it does not require the
 * service-role rate-limit RPC used by higher-impact API endpoints.
 */
export const PROFILE_UPDATE_COOLDOWN_SECONDS = 15;

export function profileUpdateCooldown(updatedAt: string | null | undefined, now = Date.now()): number {
  if (!updatedAt) return 0;
  const last = Date.parse(updatedAt);
  if (!Number.isFinite(last)) return PROFILE_UPDATE_COOLDOWN_SECONDS;
  const seconds = Math.ceil((last + PROFILE_UPDATE_COOLDOWN_SECONDS * 1000 - now) / 1000);
  return Math.max(0, Math.min(PROFILE_UPDATE_COOLDOWN_SECONDS, seconds));
}
