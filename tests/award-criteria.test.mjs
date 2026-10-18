import test from "node:test";
import assert from "node:assert/strict";
import { AWARD_CRITERIA, AWARD_CRITERIA_BY_CODE } from "../lib/award-criteria.ts";
import { CRITERION_CODES } from "../lib/criteria-rules.ts";

test("award framework contains every C1-C9 code exactly once in the required order", () => {
  assert.equal(AWARD_CRITERIA.length, 9);
  assert.deepEqual(AWARD_CRITERIA.map((item) => item.code), [...CRITERION_CODES]);
  assert.equal(new Set(AWARD_CRITERIA.map((item) => item.code)).size, 9);
  for (const criterion of AWARD_CRITERIA) {
    assert.deepEqual(AWARD_CRITERIA_BY_CODE[criterion.code], criterion);
    assert.ok(criterion.title.length >= 20, criterion.code);
    assert.ok(criterion.description.length >= 50, criterion.code);
    assert.ok(criterion.reviewChecks.length >= 2, criterion.code);
    assert.ok(criterion.evidence.length >= 2, criterion.code);
  }
});

test("C1-C6 accept multiple evidence files; C7-C9 require a single file for individuals", () => {
  assert.deepEqual(AWARD_CRITERIA.filter((c) => c.category === "multiple").map((c) => c.code), ["C1", "C2", "C3", "C4", "C5", "C6"]);
  assert.deepEqual(AWARD_CRITERIA.filter((c) => c.category === "single").map((c) => c.code), ["C7", "C8", "C9"]);
  assert.ok(AWARD_CRITERIA.slice(6).every((c) => c.condition?.includes("Cá nhân:")));
});

test("C7-C9 framework preserves user's minimum eligibility conditions", () => {
  assert.match(AWARD_CRITERIA_BY_CODE.C7.condition, /Tốt|Xuất sắc/);
  assert.match(AWARD_CRITERIA_BY_CODE.C8.description, /2,80\/4,00/);
  assert.match(AWARD_CRITERIA_BY_CODE.C8.description, /đề xuất/);
  assert.match(AWARD_CRITERIA_BY_CODE.C9.title, /khiển trách/);
  assert.match(AWARD_CRITERIA_BY_CODE.C9.title, /quy chế/);
});

test("framework never supplies unapproved numeric weights or a pass threshold", () => {
  assert.ok(AWARD_CRITERIA.every((c) => !("weight" in c) && !("minPercentage" in c)));
});
