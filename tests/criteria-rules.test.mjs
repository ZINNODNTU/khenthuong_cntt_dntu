import test from "node:test";
import assert from "node:assert/strict";
import { CRITERION_CODES, validateCriteria } from "../lib/criteria-rules.ts";

const rows = () => CRITERION_CODES.map(code => ({ code, status: "verified", ...(code === "C9" ? { boolean_value: true } : {}) }));
const evidence = ["criterion_c2","criterion_c7","criterion_c8"];
test("all nine criterion records must exist at submission", () => {
  assert.match(validateCriteria([], "individual", "submit").join(" "), /thiếu các tiêu chí/);
  assert.deepEqual(validateCriteria(rows(), "individual", "submit"), []);
});
test("submit requires C9 signed even if all other criteria records exist", () => {
  const data = rows();
  data[8].boolean_value = false;
  assert.match(validateCriteria(data, "individual", "submit").join(" "), /C9.*cam kết/);
  assert.deepEqual(validateCriteria(rows(), "individual", "submit"), []);
});
test("pass requires selected A criteria and all B criteria verified", () => {
  const data = rows();
  data[0].status = "pending";
  assert.deepEqual(validateCriteria(data, "individual", "pass", evidence), []);
  data[1].status = "rejected";
  assert.match(validateCriteria(data, "individual", "pass", evidence).join(" "), /C2/);
  data[1].status = "verified";
  data[7].status = "pending";
  assert.match(validateCriteria(data, "individual", "pass", evidence).join(" "), /C8/);
});
test("pass requires a commitment and at least one personal achievement", () => {
  const data = rows();
  data[8].boolean_value = false;
  assert.match(validateCriteria(data, "individual", "pass", evidence).join(" "), /cam kết/);
  assert.match(validateCriteria(rows(), "individual", "pass", ["criterion_c7","criterion_c8"]).join(" "), /ít nhất một/);
});
test("collective review considers C1-C6 only", () => {
  const data = rows();
  for (const row of data) if (["C7", "C8", "C9"].includes(row.code)) row.status = "pending";
  assert.deepEqual(validateCriteria(data, "collective", "pass"), []);
});
test("duplicate criterion is refused", () => {
  const data = rows();
  data.push({ ...data[0] });
  assert.match(validateCriteria(data, "individual", "pass", evidence).join(" "), /trùng/);
});
