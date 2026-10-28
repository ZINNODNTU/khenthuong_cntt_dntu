import test from "node:test";
import assert from "node:assert/strict";
import { auditRowFromEvent, sanitizeAuditMetadata, writeAudit } from "../lib/audit.ts";

const id = "f267de70-b4c3-4976-b6db-21d9f947fcbc";

test("legacy writer uses exactly the six real audit_logs insert fields", () => {
  const row = auditRowFromEvent(id, "account.change_password", "profile", id, { method: "current_password" });
  assert.deepEqual(Object.keys(row).sort(), ["actor_id", "action", "entity_type", "entity_id", "metadata"].sort());
  assert.equal(row.action, "account.change_password");
  assert.deepEqual(row.metadata, { method: "current_password", module: "profile" });
});

test("expanded event maps extended columns to metadata, never to nonexistent DB columns", () => {
  const row = auditRowFromEvent({
    actor_id: id, action: "account.password_reset", module: "auth",
    resource_type: "profile", resource_id: id, status: "success",
    description: "Recovered via email",
  });
  assert.equal(row.entity_type, "profile");
  assert.equal(row.metadata.module, "auth");
  assert.equal(row.metadata.status, "success");
  assert.equal("resource_type" in row, false);
});

test("audit metadata recursively removes password, tokens, authorization and cookie fields", () => {
  const result = sanitizeAuditMetadata({ password: "NO", access_token: "NO", scope: "auth",
    values: { new_password: "NO", otp: "NO", field: "public" },
  });
  assert.deepEqual(result, { scope: "auth", values: { field: "public" } });
});

test("writeAudit records a canonical row and reports insert failure without throwing", async () => {
  let inserted;
  const ok = { from: name => {
    assert.equal(name, "audit_logs");
    return { insert: async row => { inserted = row; return { error: null }; } };
  } };
  assert.equal(await writeAudit(ok, id, "profile.update_self", "profile", id, {}), true);
  assert.equal(inserted.action, "profile.update_self");
  const fail = { from: () => ({ insert: async () => ({ error: { code: "42501" } }) }) };
  const previous = console.error;
  console.error = () => {};
  try { assert.equal(await writeAudit(fail, id, "profile.update_self", "profile", id), false); }
  finally { console.error = previous; }
});
