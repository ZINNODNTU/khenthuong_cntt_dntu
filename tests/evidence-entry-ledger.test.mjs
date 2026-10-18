import test from "node:test";
import assert from "node:assert/strict";
import { validateEvidenceEntryLedger } from "../lib/evidence-entry-rules.ts";

const entry = (id, code, title = "Hoạt động tiêu biểu") => ({ id, criterion_code: code, title });
const file = (id, code) => ({ evidence_entry_id: id, category: "criterion_" + code.toLowerCase() });

test("C1-C6 permit multiple named statements and many files per statement", () => {
  const statements = [entry("a", "C1"), entry("b", "C1", "Tổ chức ngày hội")];
  const attachments = [file("a", "C1"), file("a", "C1"), file("b", "C1")];
  assert.deepEqual(validateEvidenceEntryLedger(statements, attachments, "individual"), []);
});

test("legacy attachments without statement IDs are still accepted", () => {
  assert.deepEqual(validateEvidenceEntryLedger([], [{ category: "criterion_c1" }], "individual"), []);
});

test("submitted statements require at least one file", () => {
  const issues = validateEvidenceEntryLedger([entry("a", "C4")], [], "individual");
  assert.ok(issues.some(issue => /C4.*chưa có tệp/.test(issue)));
});

test("file category must match the statement criterion", () => {
  const issues = validateEvidenceEntryLedger([entry("a", "C2")], [file("a", "C1")], "individual");
  assert.ok(issues.some(issue => /không cùng tiêu chí/.test(issue)));
});

test("mandatory individual criteria allow one statement and one file only", () => {
  assert.deepEqual(validateEvidenceEntryLedger([entry("a", "C7")], [file("a", "C7")], "individual"), []);
  const issues = validateEvidenceEntryLedger([entry("a", "C7"), entry("b", "C7")],
    [file("a", "C7"), file("b", "C7")], "individual");
  assert.ok(issues.some(issue => /Chỉ được khai một/.test(issue)));
  assert.ok(issues.some(issue => /Chỉ được nộp một/.test(issue)));
});

test("collective applications reject statements for C7-C9", () => {
  const issues = validateEvidenceEntryLedger([entry("a", "C8")], [file("a", "C8")], "collective");
  assert.ok(issues.some(issue => /Không áp dụng cho hồ sơ tập thể/.test(issue)));
});

test("files may not refer to a deleted or nonexistent statement", () => {
  const issues = validateEvidenceEntryLedger([], [file("missing", "C5")], "individual");
  assert.ok(issues.some(issue => /không tồn tại/.test(issue)));
});

test("statement titles cannot be blank", () => {
  const issues = validateEvidenceEntryLedger([entry("a", "C3", " ")], [file("a", "C3")], "individual");
  assert.ok(issues.some(issue => /Tên thông tin/.test(issue)));
});
