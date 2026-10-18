import type { ApplicationCriterion, CriterionCode } from "@/lib/types";

export type ScoredCode = Extract<CriterionCode, "C1" | "C2" | "C3" | "C4" | "C5" | "C6">;
export type AwardRubric = {
  id: string;
  evaluation_period_id: string;
  application_type: "individual" | "collective";
  weights: Record<ScoredCode, number>;
  min_percentage: number;
  instructions: string;
};
export type AwardScoreEntry = {
  application_id: string;
  code: ScoredCode;
  rubric_id: string;
  points: number;
  note: string;
  scored_at: string;
  scored_by: string;
};

export const SCORED_CODES: readonly ScoredCode[] = ["C1", "C2", "C3", "C4", "C5", "C6"];
export const rubricTitles: Record<ScoredCode, string> = {
  C1: "Đóng góp nổi bật cho công tác Đoàn – Hội",
  C2: "Vai trò tổ chức và điều phối hoạt động",
  C3: "Thành tích, chứng nhận và khen thưởng",
  C4: "Mức độ tham gia thường xuyên",
  C5: "Vai trò cán bộ và trách nhiệm",
  C6: "Sáng kiến và sức lan tỏa",
};

export function isValidWeights(weights: Record<ScoredCode, number>): boolean {
  return SCORED_CODES.every(code =>
    Number.isFinite(weights[code]) && weights[code] > 0 && weights[code] <= 100 &&
    Math.abs(Math.round(weights[code] * 100) - weights[code] * 100) < 1e-6
  ) && Math.abs(SCORED_CODES.reduce((sum, code) => sum + weights[code], 0) - 100) < 0.001;
}

type CriterionState = Pick<ApplicationCriterion, "code" | "status">;
type Mark = Pick<AwardScoreEntry, "code" | "points" | "rubric_id">;

export function summarizeAwardScores(
  rubric: AwardRubric | null,
  criteria: readonly CriterionState[],
  marks: readonly Mark[],
) {
  if (!rubric) return {
    configured: false, earned: 0, possible: 0, percentage: null as number | null,
    marked: 0, required: 0, missing: [] as ScoredCode[], complete: false, meetsThreshold: false,
  };
  const byCode = new Map(criteria.map(item => [item.code, item]));
  const byMark = new Map(marks.map(item => [item.code, item]));
  let earned = 0;
  let possible = 0;
  let marked = 0;
  let required = 0;
  const missing: ScoredCode[] = [];
  for (const code of SCORED_CODES) {
    const criterion = byCode.get(code);
    if (criterion?.status === "not_applicable") continue;
    if (criterion?.status === "verified") {
      required += 1;
      possible += rubric.weights[code];
      const mark = byMark.get(code);
      if (mark && mark.rubric_id === rubric.id && Number.isFinite(mark.points)
        && mark.points >= 0 && mark.points <= rubric.weights[code]) {
        marked += 1;
        earned += mark.points;
      } else {
        missing.push(code);
      }
    } else {
      missing.push(code);
    }
  }
  const complete = possible > 0 && required === marked && missing.length === 0;
  const percentage = possible > 0 ? Math.round((earned * 100 / possible + Number.EPSILON) * 100) / 100 : null;
  return {
    configured: true, earned, possible, percentage, marked, required, missing,
    complete, meetsThreshold: complete && earned * 100 >= possible * rubric.min_percentage,
  };
}
