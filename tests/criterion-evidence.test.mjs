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
test("C7-C9 allow one uploaded document; other criteria allow many", () => {
  for (const code of EVIDENCE_CODES) {
    assert.equal(criterionFileLimit(code), ["C7", "C8", "C9"].includes(code) ? 1 : 20);
  }
});
test("submission requires all nine documents for individual applicant", () => {
  const categories = EVIDENCE_CODES.filter(code => code.startsWith('C')).map(criterionCategory);
  assert.deepEqual(validateCriterionEvidence(categories, "individual"), []);
  assert.match(validateCriterionEvidence(categories.filter(x => x !== "criterion_c7"), "individual").join(" "), /C7/);
});
test("single-document criteria reject multiple uploaded documents", () => {
  const categories = [...EVIDENCE_CODES.filter(code => code.startsWith("C")).map(criterionCategory), "criterion_c8"];
  assert.match(validateCriterionEvidence(categories, "individual").join(" "), /C8/);
});
test("C1-C6 may have multiple evidence files", () => {
  const categories = [...EVIDENCE_CODES.filter(code => code.startsWith("C")).map(criterionCategory), "criterion_c1", "criterion_c3"];
  assert.deepEqual(validateCriterionEvidence(categories, "individual"), []);
});
test("collective dossier requires six applicable criteria only", () => {
  const categories = EVIDENCE_CODES.slice(0, 6).map(criterionCategory);
  assert.deepEqual(validateCriterionEvidence(categories, "collective"), []);
});
