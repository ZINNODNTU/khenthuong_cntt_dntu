import type { ApplicationCriterion, CriterionCode } from "@/lib/types";

export const CRITERION_CODES: readonly CriterionCode[] = ["C1","C2","C3","C4","C5","C6","C7","C8","C9"];
export const COLLECTIVE_CRITERION_CODES: readonly CriterionCode[] = ["T1","T2","T3","T4","T5","T6"];
const OLD_COLLECTIVE_CODES: readonly CriterionCode[] = ["C1","C2","C3","C4","C5","C6"];
type CriterionValues = Pick<ApplicationCriterion, "code" | "status">;

export function validateCriteria(
  rows: readonly CriterionValues[], applicationType: "individual" | "collective",
  phase: "submit" | "pass",
): string[] {
  const issues: string[] = [];
  const byCode = new Map(rows.map(row => [row.code, row]));
  if (byCode.size !== rows.length) issues.push("Hồ sơ có tiêu chí bị trùng.");
  const hasNew = applicationType === "collective" && rows.some(row => row.code.startsWith("T"));
  const expected: readonly CriterionCode[] = applicationType === "individual" ? CRITERION_CODES
    : hasNew ? COLLECTIVE_CRITERION_CODES : CRITERION_CODES; // legacy collective rows include C7–C9.
  const reviewable = applicationType === "individual" ? CRITERION_CODES
    : hasNew ? COLLECTIVE_CRITERION_CODES : OLD_COLLECTIVE_CODES;
  const missing = expected.filter(code => !byCode.has(code));
  if (missing.length) issues.push(`Hồ sơ thiếu các tiêu chí ${missing.join(", ")}.`);
  if (rows.some(row => !expected.includes(row.code))) issues.push("Hồ sơ có mã tiêu chí không thuộc bộ tiêu chí được áp dụng.");
  if (phase === "pass") {
    for (const code of reviewable) {
      if (byCode.get(code)?.status !== "verified") issues.push(`${code}: Tiêu chí chưa được đánh giá Đạt.`);
    }
  }
  return issues;
}
