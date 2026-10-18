import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const sql = readFileSync(new URL("../supabase/migrations/20261009110000_collective_criteria_t_codes.sql",import.meta.url),"utf8");
const source = readFileSync(new URL("../supabase/database/08_COLLECTIVE_CRITERIA_T.sql",import.meta.url),"utf8");

test("additive collective migration matches maintained SQL and never resets historical applications",()=>{
  assert.equal(sql,source);
  assert.match(sql,/begin;[\s\S]*commit;/i);
  assert.doesNotMatch(sql,/drop\s+table|truncate\s+|delete\s+from\s+public\.(?:applications|application_criteria)\b/i);
  assert.match(sql,/delete\s+from\s+public\.evidences\s+where\s+id\s*=\s*v_row\.id/i);
  assert.match(sql,/T1.*T6/i);
});

test("SQL maintains distinct evidence categories, per-file quotas and secure Drive cleanup",()=>{
  assert.match(sql,/criterion_\(c\[1-9\]\|t\[1-6\]\)/);
  assert.match(sql,/guard_criterion_file_limit/);
  assert.match(sql,/delete_owned_evidence/);
  assert.match(sql,/storage_cleanup_queue/);
  assert.match(sql,/MIXED_CRITERION_SCHEMES/);
});

test("review guards and decision RPC require the applicable scheme and verified evidence",()=>{
  assert.match(sql,/create or replace function public\.assert_award_criteria_complete/);
  assert.match(sql,/create or replace function public\.guard_criterion_evidence_submission/);
  assert.match(sql,/create or replace function public\.guard_passed_application_criteria/);
  assert.match(sql,/create or replace function public\.record_application_decision/);
  assert.match(sql,/perform public\.assert_award_criteria_complete\(p_application_id,true\)/);
  assert.match(sql,/CRITERION_EVIDENCE_MISSING/);
});

test("legacy collective migration is retained; new applications use individual criteria only",()=>{
  const create=readFileSync(new URL("../app/api/applications/route.ts",import.meta.url),"utf8");
  const upload=readFileSync(new URL("../app/api/evidence/upload/route.ts",import.meta.url),"utf8");
  const review=readFileSync(new URL("../app/api/applications/[id]/criteria/route.ts",import.meta.url),"utf8");
  const guard=readFileSync(new URL("../supabase/migrations/20261018190000_individual_award_only.sql",import.meta.url),"utf8");
  assert.doesNotMatch(create,/getAwardCriteria\("collective"\)/);
  assert.match(create,/submission_scope !== "individual"/);
  assert.match(create,/application_type: "individual"/);
  assert.match(guard,/BEFORE INSERT ON public\.applications/);
  assert.match(guard,/INDIVIDUAL_AWARD_ONLY/);
  assert.doesNotMatch(guard,/(?:truncate|delete\s+from)\s+public\.(?:applications|profiles)/i);
  assert.match(upload,/categoryCriterion\(category\)/);
  assert.match(review,/z\.enum\(EVIDENCE_CODES\)/);
});
