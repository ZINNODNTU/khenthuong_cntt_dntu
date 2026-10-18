import { createAdminClient } from "@/lib/supabase/admin";
import { deleteEvidence } from "@/lib/apps-script-storage";

/** The outbox table is service-role-only. A Drive deletion never removes a referenced file. */
export async function enqueueStorageCleanup(driveFileId: string, delayMs = 0) {
  const { error } = await createAdminClient().from("storage_cleanup_queue")
    .upsert({ drive_file_id: driveFileId, next_attempt_at: new Date(Date.now() + Math.max(0, delayMs)).toISOString() }, { onConflict: "drive_file_id" });
  if (error) throw error;
}

export async function processStorageCleanup(driveFileId: string) {
  const admin = createAdminClient();
  const { data: queue, error: lookupError } = await admin.from("storage_cleanup_queue")
    .select("id,attempts").eq("drive_file_id", driveFileId).maybeSingle();
  if (lookupError) throw lookupError;
  if (!queue) return "missing" as const;
  const { data: referenced, error: refError } = await admin.from("evidences")
    .select("id").eq("drive_file_id", driveFileId).limit(1);
  if (refError) throw refError;
  if (referenced?.length) {
    // Never delete a Drive file still used by any committed evidence row.
    const { error } = await admin.from("storage_cleanup_queue").delete().eq("id", queue.id);
    if (error) throw error;
    return "referenced" as const;
  }
  try {
    await deleteEvidence(driveFileId);
    const { error } = await admin.from("storage_cleanup_queue").delete().eq("id", queue.id);
    if (error) throw error;
    return "deleted" as const;
  } catch (error) {
    const attempts = queue.attempts + 1;
    await admin.from("storage_cleanup_queue").update({
      attempts,
      last_error: error instanceof Error ? error.name.slice(0, 60) : "unknown",
      next_attempt_at: new Date(Date.now() + Math.min(86400000, 60000 * (2 ** Math.min(attempts, 10)))).toISOString(),
    }).eq("id", queue.id);
    return "retry" as const;
  }
}

export async function processDueStorageCleanup(limit = 20) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("storage_cleanup_queue")
    .select("drive_file_id").lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true }).limit(Math.max(1, Math.min(limit, 40)));
  if (error) throw error;
  const counts = { deleted: 0, referenced: 0, retry: 0, missing: 0, errors: 0 };
  const pending = data || [];
  let next = 0;
  // Do not start new Google calls late in the 60-second Vercel execution:
  // each in-flight gateway request itself has a bounded 38-second timeout.
  const startDeadline = Date.now() + 15000;
  async function worker() {
    while (next < pending.length && Date.now() < startDeadline) {
      const file = pending[next++];
      try {
        const outcome = await processStorageCleanup(file.drive_file_id);
        counts[outcome]++;
      } catch (error) {
        counts.errors++;
        console.error("[storage.cleanup.file]", { reason: error instanceof Error ? error.name : "unknown" });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, () => worker()));
  const cutoff = new Date(Date.now() - 3 * 86400000).toISOString();
  const { error: trimError } = await admin.from("security_rate_limits").delete().lt("updated_at", cutoff);
  if (trimError) console.error("[security.rate_limit.trim_failed]", { code: trimError.code });
  return { ...counts, picked: next, remainingInBatch: pending.length - next };
}