// Check named evidence records independently of the storage transport.
export type EvidenceEntryCheck = { id: string; criterion_code: string; title: string };
export type LinkedEvidenceCheck = { evidence_entry_id?: string | null; category: string };
const singleCriteria = new Set(["C7","C8","C9"]);

export function validateEvidenceEntryLedger(
  entries: readonly EvidenceEntryCheck[],
  files: readonly LinkedEvidenceCheck[],
  applicationType: "individual" | "collective",
  persistedCodes?: readonly string[],
): string[] {
  const issues: string[] = [];
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const collectiveNew = applicationType === "collective" && (
    persistedCodes?.some(code => /^T[1-6]$/.test(code))
    || entries.some(entry => /^T[1-6]$/.test(entry.criterion_code))
  );
  for (const entry of entries) {
    const code = entry.criterion_code;
    const valid = applicationType === "individual" ? /^C[1-9]$/.test(code)
      : collectiveNew ? /^T[1-6]$/.test(code) : /^C[1-6]$/.test(code);
    if (!valid) { issues.push(applicationType === "collective" && singleCriteria.has(code)
      ? `${code}: Không áp dụng cho hồ sơ tập thể.`
      : `${code}: Tiêu chí kê khai không thuộc bộ tiêu chí của hồ sơ.`); continue; }
    if (entry.title.trim().length < 3 || entry.title.trim().length > 240) {
      issues.push(`${code}: Tên thông tin minh chứng không hợp lệ.`);
    }
    const attached = files.filter(file => file.evidence_entry_id === entry.id);
    if (!attached.length) issues.push(`${code}: Mục "${entry.title}" chưa có tệp minh chứng.`);
    if (attached.some(file => file.category !== `criterion_${code.toLowerCase()}`)) {
      issues.push(`${code}: Tệp đính kèm không cùng tiêu chí.`);
    }
  }
  for (const code of singleCriteria) {
    const group = entries.filter(entry => entry.criterion_code === code);
    if (group.length > 1) issues.push(`${code}: Chỉ được khai một mục thông tin minh chứng.`);
    if (files.filter(file => file.category === `criterion_${code.toLowerCase()}`).length > 1) {
      issues.push(`${code}: Chỉ được nộp một tệp minh chứng.`);
    }
  }
  if (files.some(file => file.evidence_entry_id && !byId.has(file.evidence_entry_id))) {
    issues.push("Có tệp tham chiếu thông tin minh chứng không tồn tại.");
  }
  return issues;
}
