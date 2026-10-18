import test from "node:test";
import assert from "node:assert/strict";
import { escapeCsvCell } from "../lib/report-csv.ts";

test("CSV quotes delimiters and multiline comments", () => {
  assert.equal(escapeCsvCell('Nguyễn, "Đạt"'), '"Nguyễn, ""Đạt"""');
  assert.equal(escapeCsvCell("Dòng 1\r\nDòng 2"), '"Dòng 1\nDòng 2"');
  assert.equal(escapeCsvCell(null), '""');
});

test("CSV neutralizes spreadsheet formulas without stripping original comment", () => {
  for (const dangerous of [
    "=HYPERLINK(\"http://example.com\")", "+SUM(1,2)",
    "-123+1", "@SUM(1,2)", " \t=1+1", "\uFEFF=NOW()", "\u200B=1",
  ]) {
    const result = escapeCsvCell(dangerous);
    assert.equal(result[0], '"');
    assert.ok(result.includes("'"), `Expected a protective apostrophe for ${dangerous}`);
  }
});

test("ordinary values are unchanged apart from CSV quoting", () => {
  assert.equal(escapeCsvCell("Đạt 9/9 tiêu chí"), '"Đạt 9/9 tiêu chí"');
  assert.equal(escapeCsvCell("2026-10-08"), '"2026-10-08"');
});
