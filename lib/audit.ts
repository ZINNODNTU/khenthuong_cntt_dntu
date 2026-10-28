import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Database schema (initial_award_schema): audit_logs has only
 * id, actor_id, action, entity_type, entity_id, metadata, created_at.
 * All extended attributes MUST be kept inside metadata.
 */
export type AuditModule = "auth" | "accounts" | "roles" | "periods" | "criteria" |
  "applications" | "review" | "evidences" | "notifications" | "config" | "email" | "backup" | "system";
export type AuditStatus = "success" | "failure";
export type AuditAction = string;

export interface AuditEntry {
  id: string | number;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  module: string;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  description: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[];
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

export type AuditEvent = {
  actor_id: string;
  action: string;
  module: string;
  resource_type?: string | null;
  resource_id?: string | null;
  description?: string | null;
  status?: AuditStatus;
  new_values?: Record<string, unknown> | null;
  old_values?: Record<string, unknown> | null;
  changed_fields?: string[];
  [key: string]: unknown;
};

const SENSITIVE = /(?:^|_)(?:password|password_hash|access_token|refresh_token|secret|secret_key|otp|totp|mfa_code|cookie|session_token|api_key|private_key|authorization|token_hash)(?:$|_)/i;
const EXTRAS = new Set(["actor_id", "action", "resource_type", "resource_id", "module"]);

export function sanitizeAuditMetadata(value: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!value) return {};
  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE.test(key) || val === undefined) continue;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      output[key] = sanitizeAuditMetadata(val as Record<string, unknown>);
    } else if (Array.isArray(val)) {
      output[key] = val.slice(0, 15).map(item =>
        item && typeof item === "object" && !Array.isArray(item)
          ? sanitizeAuditMetadata(item as Record<string, unknown>) : item);
    } else if (typeof val === "string") {
      output[key] = val.slice(0, 350);
    } else {
      output[key] = val;
    }
  }
  return output;
}

export function auditRowFromEvent(...args:
  | [actorId: string, action: string, entityType: string, entityId: string | null, metadata?: Record<string, unknown>]
  | [event: AuditEvent]
) {
  if (typeof args[0] === "string") {
    const [actor_id, action, entity_type, entity_id, details] = args as [
      string, string, string, string | null, Record<string, unknown> | undefined
    ];
    const metadata = sanitizeAuditMetadata(details);
    return {
      actor_id, action, entity_type, entity_id,
      metadata: { ...metadata, module: typeof metadata.module === "string" ? metadata.module : entity_type },
    };
  }
  const { actor_id, action, resource_type, resource_id, module, ...rest } = args[0] as AuditEvent;
  return {
    actor_id, action, entity_type: resource_type || "system", entity_id: resource_id || null,
    metadata: { ...sanitizeAuditMetadata(rest), module },
  };
}

/** Never throw after the business operation has already committed. Report
 * failures to runtime logs and surface an auditRecorded flag to the caller.
 */
export async function writeAudit(
  supabase: SupabaseClient,
  ...args:
    | [actorId: string, action: string, entityType: string, entityId: string | null, metadata?: Record<string, unknown>]
    | [entry: AuditEvent]
): Promise<boolean> {
  const row = auditRowFromEvent(...args);
  try {
    const { error } = await supabase.from("audit_logs").insert(row);
    if (error) {
      console.error("[audit.insert_failed]", { action: row.action, code: error.code, status: error.hint ? "schema_or_permission" : "database" });
      return false;
    }
    return true;
  } catch (error) {
    console.error("[audit.insert_exception]", { action: row.action, reason: error instanceof Error ? error.name : "unknown" });
    return false;
  }
}
