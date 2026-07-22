import type { SupabaseClient } from "@supabase/supabase-js";
export async function writeAudit(supabase: SupabaseClient, actorId: string, action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown> = {}) {
    await supabase.from("audit_logs").insert({ actor_id: actorId, action, entity_type: entityType, entity_id: entityId, metadata });
}

