import type { Evidence } from "@/lib/types";
/** Minh chứng luôn ở chế độ riêng tư; không đưa legacy public_token xuống trình duyệt. */
export function getPublicEvidenceUrl(evidence: Pick<Evidence, "id">) {
  return `/api/evidence/${encodeURIComponent(evidence.id)}`;
}
