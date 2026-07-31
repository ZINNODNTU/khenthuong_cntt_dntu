import type { SupabaseClient } from "@supabase/supabase-js";

/** Categories for audit log grouping */
export type AuditModule =
  | "auth" | "accounts" | "roles" | "periods" | "criteria"
  | "applications" | "review" | "evidences" | "notifications"
  | "config" | "email" | "backup" | "system";

export type AuditAction =
  | "login_success" | "login_failed" | "logout"
  | "password_reset" | "password_change"
  | "account_lock" | "account_unlock"
  | "session_revoke"
  | "create" | "update" | "delete" | "restore"
  | "role_change" | "scope_change"
  | "import" | "export"
  | "approve" | "reject" | "revision_request"
  | "status_change" | "assignment_change"
  | "upload" | "download" | "view"
  | "config_change" | "backup" | "restore_data"
  | "error_api" | "error_email" | "error_file";

export type AuditStatus = "success" | "failure";

export interface AuditEntry {
  id: string;
  created_at: string;
  actor_id: string;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: AuditAction;
  module: AuditModule;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  description: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  status: AuditStatus;
  error_message: string | null;
  request_id: string | null;
  session_id: string | null;
  user_agent: string | null;
  device_type: string | null;
  source: string | null;
  organization_id: string | null;
  evaluation_period_id: string | null;
}

/**
 * Write a structured audit log entry.
 * Supports both old positional form and new object form:
 *   writeAudit(supabase, actorId, action, entityType, entityId, metadata)
 *   writeAudit(supabase, { actor_id, action, module, ... })
 */
export async function writeAudit(
  supabase: SupabaseClient,
  ...args:
    | [
        actorId: string,
        action: string,
        entityType: string,
        entityId: string | null,
        metadata?: Record<string, unknown>,
      ]
    | [entry: {
        actor_id: string;
        actor_name?: string | null;
        actor_email?: string | null;
        actor_role?: string | null;
        action: string;
        module: string;
        resource_type?: string | null;
        resource_id?: string | null;
        resource_name?: string | null;
        description?: string | null;
        old_values?: Record<string, unknown> | null;
        new_values?: Record<string, unknown> | null;
        changed_fields?: string[] | null;
        status?: string;
        error_message?: string | null;
        request_id?: string | null;
        session_id?: string | null;
        user_agent?: string | null;
        device_type?: string | null;
        source?: string | null;
        organization_id?: string | null;
        evaluation_period_id?: string | null;
      }]
) {
  if (args.length >= 4) {
    // Old positional form
    const [actorId, action, entityType, entityId, metadata] = args as [
      string, string, string, string | null, Record<string, unknown> | undefined,
    ];
    await supabase.from("audit_logs").insert({
      actor_id: actorId,
      action,
      resource_type: entityType,
      resource_id: entityId,
      module: entityType?.split("_")[0] || "system",
      metadata: sanitizeForAudit(metadata ?? null),
    });
    return;
  }

  // New object form
  const entry = args[0] as NonNullable<typeof args[0]> & Record<string, unknown>;
  const sanitizedOld = sanitizeForAudit(entry.old_values as Record<string, unknown> | null | undefined);
  const sanitizedNew = sanitizeForAudit(entry.new_values as Record<string, unknown> | null | undefined);

  await supabase.from("audit_logs").insert({
    actor_id: entry.actor_id,
    actor_name: entry.actor_name ?? null,
    actor_email: entry.actor_email ?? null,
    actor_role: entry.actor_role ?? null,
    action: entry.action,
    module: entry.module,
    resource_type: entry.resource_type ?? null,
    resource_id: entry.resource_id ?? null,
    resource_name: entry.resource_name ?? null,
    description: entry.description ?? null,
    old_values: sanitizedOld,
    new_values: sanitizedNew,
    changed_fields: entry.changed_fields ?? null,
    status: entry.status ?? "success",
    error_message: entry.error_message ?? null,
    request_id: entry.request_id ?? null,
    session_id: entry.session_id ?? null,
    user_agent: entry.user_agent ?? null,
    device_type: entry.device_type ?? null,
    source: entry.source ?? null,
    organization_id: entry.organization_id ?? null,
    evaluation_period_id: entry.evaluation_period_id ?? null,
  });
}

/** Strip sensitive fields before persisting */
function sanitizeForAudit(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data) return null;
  const SENSITIVE = new Set([
    "password", "password_hash", "access_token", "refresh_token",
    "secret", "secret_key", "otp", "totp", "mfa_code",
    "cookie", "session_token", "api_key", "private_key",
  ]);
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE.has(key)) continue;
    clean[key] = value;
  }
  return clean;
}
