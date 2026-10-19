import test from "node:test";
import assert from "node:assert/strict";
import {
  EVIDENCE_CODES, criterionCategory, categoryCriterion, criterionFileLimit, validateCriterionEvidence,
} from "../lib/criterion-evidence.ts";

test("criterion categories round-trip", () => {
  for (const code of EVIDENCE_CODES) assert.equal(categoryCriterion(criterionCategory(code)), code);
  assert.equal(categoryCriterion("criterion_c10"), null);
  assert.equal(categoryCriterion("main"), null);
});
test("C7-C9 limit historical evidence files; C1-C6 allow many", () => {
  for (const code of EVIDENCE_CODES) {
    assert.equal(criterionFileLimit(code), ["C7", "C8", "C9"].includes(code) ? 1 : 20);
  }
});
test("individual applicants can submit any one personal achievement with C7 and C8", () => {
  assert.deepEqual(validateCriterionEvidence(["criterion_c3","criterion_c7","criterion_c8"], "individual"), []);
  assert.deepEqual(validateCriterionEvidence(["criterion_c6","criterion_c7","criterion_c8"], "individual"), []);
  assert.match(validateCriterionEvidence(["criterion_c7","criterion_c8"], "individual").join(" "), /C1–C6/);
  assert.match(validateCriterionEvidence(["criterion_c1","criterion_c8"], "individual").join(" "), /C7/);
  assert.match(validateCriterionEvidence(["criterion_c1","criterion_c7"], "individual").join(" "), /C8/);
});
test("C9 does not require an uploaded document because it uses a checkbox", () => {
  assert.deepEqual(validateCriterionEvidence(["criterion_c1","criterion_c7","criterion_c8"], "individual"), []);
});
test("single-document evidence limits are enforced", () => {
  assert.match(validateCriterionEvidence(["criterion_c1","criterion_c7","criterion_c8","criterion_c8"], "individual").join(" "), /C8/);
});
test("C1-C6 accept many files when declared", () => {
  assert.deepEqual(validateCriterionEvidence(["criterion_c1","criterion_c1","criterion_c3","criterion_c7","criterion_c8"], "individual"), []);
});
test("collective dossier retains its historical six mandatory criteria", () => {
  const categories = EVIDENCE_CODES.slice(0, 6).map(criterionCategory);
  assert.deepEqual(validateCriterionEvidence(categories, "collective"), []);
});
