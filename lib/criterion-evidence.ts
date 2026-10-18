import type { CriterionCode } from "@/lib/types";

export const EVIDENCE_CODES = ["C1","C2","C3","C4","C5","C6","C7","C8","C9","T1","T2","T3","T4","T5","T6"] as const satisfies readonly CriterionCode[];
export const SINGLE_EVIDENCE_CODES = ["C7","C8","C9"] as const;
export const MAX_CRITERION_FILES = 20;
const individualCodes = ["C1","C2","C3","C4","C5","C6","C7","C8","C9"] as const;
const oldCollectiveCodes = ["C1","C2","C3","C4","C5","C6"] as const;
const collectiveCodes = ["T1","T2","T3","T4","T5","T6"] as const;

export function isCriterionCode(value: string): value is CriterionCode {
  return (EVIDENCE_CODES as readonly string[]).includes(value);
}
export function criterionCategory(code: CriterionCode): string {
  return `criterion_${code.toLowerCase()}`;
}
export function categoryCriterion(category: string): CriterionCode | null {
  const match = /^criterion_((?:c[1-9])|(?:t[1-6]))$/.exec(category);
  return match ? match[1].toUpperCase() as CriterionCode : null;
}
export function criterionFileLimit(code: CriterionCode): number {
  return (SINGLE_EVIDENCE_CODES as readonly string[]).includes(code) ? 1 : MAX_CRITERION_FILES;
}
export function validateCriterionEvidence(
  categories: readonly string[],
  type: "individual" | "collective",
  persistedCodes?: readonly CriterionCode[],
): string[] {
  const codes: readonly CriterionCode[] = type === "individual" ? individualCodes
    : persistedCodes?.some(x => x.startsWith("T")) || categories.some(x => /^criterion_t[1-6]$/.test(x))
      ? collectiveCodes : oldCollectiveCodes;
  const issues: string[] = [];
  for (const code of codes) {
    const count = categories.filter(category => category === criterionCategory(code)).length;
    if (count === 0) issues.push(`${code}: Cần tải lên ít nhất 01 minh chứng.`);
    if (count > criterionFileLimit(code)) issues.push(`${code}: Số minh chứng vượt giới hạn.`);
  }
  const foreign = categories.filter(category => {
    const code = categoryCriterion(category);
    return code && !codes.includes(code);
  });
  if (foreign.length) issues.push("Có tệp minh chứng không thuộc bộ tiêu chí của hồ sơ.");
  return issues;
}
