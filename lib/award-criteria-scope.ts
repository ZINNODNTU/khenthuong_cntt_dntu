import type { CriterionCode } from "./types";
import { AWARD_CRITERIA, AWARD_CRITERIA_BY_CODE } from "./award-criteria.ts";
import { COLLECTIVE_AWARD_CRITERIA } from "./collective-award-criteria.ts";
import type { AwardCriterionDefinition } from "./award-criteria";

export type AwardSubject = "individual" | "collective";

/** New collective dossiers persist T1–T6. Historical dossiers retain C1–C9. */
export const COLLECTIVE_CODES = ["T1", "T2", "T3", "T4", "T5", "T6"] as const satisfies readonly CriterionCode[];
export const LEGACY_COLLECTIVE_CODES = ["C1", "C2", "C3", "C4", "C5", "C6"] as const satisfies readonly CriterionCode[];
export const INDIVIDUAL_CODES = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9"] as const satisfies readonly CriterionCode[];

const collectiveByCode = Object.fromEntries(
  COLLECTIVE_AWARD_CRITERIA.map((item, index) => [COLLECTIVE_CODES[index], item]),
) as Partial<Record<CriterionCode, AwardCriterionDefinition>>;

function newCollectiveDefinition(code: CriterionCode): AwardCriterionDefinition | undefined {
  const item = collectiveByCode[code];
  return item ? { ...item, code } : undefined;
}

export function getAwardCriteria(subject: AwardSubject): readonly AwardCriterionDefinition[] {
  return subject === "individual"
    ? AWARD_CRITERIA
    : COLLECTIVE_CODES.map(code => newCollectiveDefinition(code)!);
}

export function getApplicableCriterionCodes(subject: AwardSubject): readonly CriterionCode[] {
  return subject === "individual" ? INDIVIDUAL_CODES : COLLECTIVE_CODES;
}

/** Historical collective C-code dossiers must keep their exact original meaning. */
export function getApplicationCriterionCodes(
  subject: AwardSubject,
  persistedCodes?: readonly CriterionCode[],
): readonly CriterionCode[] {
  if (subject === "individual") return INDIVIDUAL_CODES;
  return persistedCodes?.some(code => code.startsWith("T")) ? COLLECTIVE_CODES
    : persistedCodes?.some(code => code.startsWith("C")) ? LEGACY_COLLECTIVE_CODES
    : COLLECTIVE_CODES;
}

export function isLegacyCollectiveCriterion(code: CriterionCode, _persistedTitle?: string | null): boolean {
  return code.startsWith("C");
}

export function getCriterionDefinition(
  subject: AwardSubject, code: CriterionCode, persistedTitle?: string | null,
): AwardCriterionDefinition {
  if (subject === "collective") {
    const def = newCollectiveDefinition(code);
    if (def) return def;
    // Early collective C1–C6 dossiers stored T1–T6 titles using C identifiers.
    const index = LEGACY_COLLECTIVE_CODES.indexOf(code as typeof LEGACY_COLLECTIVE_CODES[number]);
    if (index >= 0 && persistedTitle === COLLECTIVE_AWARD_CRITERIA[index].title) {
      return { ...COLLECTIVE_AWARD_CRITERIA[index], code };
    }
  }
  return AWARD_CRITERIA_BY_CODE[code as keyof typeof AWARD_CRITERIA_BY_CODE]
    || newCollectiveDefinition(code)!;
}

export function getCriterionDisplayCode(
  subject: AwardSubject, code: CriterionCode, persistedTitle?: string | null,
): string {
  if (subject !== "collective" || code.startsWith("T")) return code;
  const index = LEGACY_COLLECTIVE_CODES.indexOf(code as typeof LEGACY_COLLECTIVE_CODES[number]);
  return index >= 0 && persistedTitle === COLLECTIVE_AWARD_CRITERIA[index].title ? COLLECTIVE_CODES[index] : code;
}

export function displayCriterionMessage(
  subject: AwardSubject, message: string,
  storedTitles: Partial<Record<CriterionCode, string>> = {},
): string {
  if (subject === "individual") return message;
  return message.replace(/\bC[1-6]\b/g, matched =>
    getCriterionDisplayCode(subject, matched as CriterionCode, storedTitles[matched as CriterionCode]));
}
