import test from "node:test";
import assert from "node:assert/strict";
import { SCORED_CODES, isValidWeights, summarizeAwardScores } from "../lib/award-scoring.ts";

const validWeights = { C1: 20, C2: 20, C3: 15, C4: 15, C5: 15, C6: 15 };
const rubric = {
  id: "rubric-1", application_type: "individual", evaluation_period_id: "period",
  weights: validWeights, min_percentage: 70, instructions: "",
};
const criteria = () => SCORED_CODES.map(code => ({ code, status: "verified" }));
const marks = () => SCORED_CODES.map(code => ({ code, rubric_id: rubric.id, points: validWeights[code] }));

test("admin weights must sum to 100 without hardcoding school policy", () => {
  assert.equal(isValidWeights(validWeights), true);
  assert.equal(isValidWeights({ ...validWeights, C1: 21 }), false);
  assert.equal(isValidWeights({ ...validWeights, C1: 0 }), false);
  assert.equal(isValidWeights({ ...validWeights, C1: 20.123 }), false);
});

test("cannot pass without a configured rubric", () => {
  assert.equal(summarizeAwardScores(null, criteria(), marks()).meetsThreshold, false);
});

test("no numeric mark can be silently substituted for verified criterion", () => {
  const result = summarizeAwardScores(rubric, criteria(), marks().slice(1));
  assert.equal(result.complete, false);
  assert.deepEqual(result.missing, ["C1"]);
  assert.equal(result.meetsThreshold, false);
});

test("a zero mark is valid, but a below-threshold score never meets the gate", () => {
  const entries = marks().map(mark => ({ ...mark, points: mark.code === "C1" ? 0 : mark.points }));
  const result = summarizeAwardScores(rubric, criteria(), entries);
  assert.equal(result.earned, 80);
  assert.equal(result.possible, 100);
  assert.equal(result.meetsThreshold, true);
  const lower = entries.map(mark => ({...mark, points: mark.code === "C2" ? 0 : mark.points}));
  assert.equal(summarizeAwardScores(rubric, criteria(), lower).meetsThreshold, false);
});

test("N/A excludes only its maximum points; no division by zero", () => {
  const states = criteria().map(row => row.code === "C6" ? { ...row, status: "not_applicable" } : row);
  const result = summarizeAwardScores(rubric, states, marks().slice(0,5));
  assert.equal(result.possible, 85);
  assert.equal(result.earned, 85);
  assert.equal(result.percentage, 100);
  assert.equal(result.meetsThreshold, true);
  const nothing = criteria().map(row => ({ ...row, status: "not_applicable" }));
  assert.equal(summarizeAwardScores(rubric, nothing, []).meetsThreshold, false);
});

test("marks from a different rubric or above maximum cannot be treated as scored", () => {
  const foreign = marks().map(m => m.code === "C1" ? { ...m, rubric_id: "wrong-id" } : m);
  assert.equal(summarizeAwardScores(rubric, criteria(), foreign).complete, false);
  const invalid = marks().map(m => m.code === "C1" ? { ...m, points: 21 } : m);
  assert.equal(summarizeAwardScores(rubric, criteria(), invalid).meetsThreshold, false);
});

test("exact threshold is inclusive", () => {
  const entries = marks().map(mark => ({
    ...mark, points: mark.code === "C1" ? 0 : mark.code === "C2" ? 10 : mark.points,
  }));
  const summary = summarizeAwardScores(rubric, criteria(), entries);
  assert.equal(summary.earned, 70);
  assert.equal(summary.meetsThreshold, true);
});
