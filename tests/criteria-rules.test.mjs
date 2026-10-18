import test from "node:test";
import assert from "node:assert/strict";
import { CRITERION_CODES, validateCriteria } from "../lib/criteria-rules.ts";

const rows = () => CRITERION_CODES.map(code => ({ code, status: "verified" }));

test("all nine criteria must exist at submission", () => {
  assert.match(validateCriteria([], "individual", "submit").join(" "), /thiếu các tiêu chí/);
  assert.deepEqual(validateCriteria(rows(), "individual", "submit"), []);
});
test("pass requires every applicable criterion verified, never numeric scoring", () => {
  const data = rows();
  data[0].status = "rejected"; data[7].status = "pending";
  const issues = validateCriteria(data, "individual", "pass").join(" ");
  assert.match(issues, /C1/);
  assert.match(issues, /C8/);
  assert.deepEqual(validateCriteria(rows(), "individual", "pass"), []);
});
test("collective review considers C1-C6 only", () => {
  const data = rows();
  for (const row of data) if (["C7", "C8", "C9"].includes(row.code)) row.status = "pending";
  assert.deepEqual(validateCriteria(data, "collective", "pass"), []);
});
test("duplicate criterion is refused", () => {
  const data = rows();
  data.push({ ...data[0] });
  assert.match(validateCriteria(data, "individual", "pass").join(" "), /trùng/);
});
