export const DEFAULT_BRANCHES = [
    "22DTH1", "22DTH2", "22DTH3", "22DTH4", "22DTH5", "22DTH6", "22DTH7",
    "23DTH1", "23DTH2", "23DTH3", "23DTH4", "23DTH5",
    "24DTH1", "24DTH2", "24DTH3", "24DPM1",
    "25DTH", "25DPM", "25DTN"
] as const;
export const APP_STATUSES = ["draft", "submitted", "review", "revision", "passed", "failed"] as const;
export type ApplicationStatus = (typeof APP_STATUSES)[number];
export const STATUS_LABEL: Record<ApplicationStatus, string> = {
    draft: "Bản nháp", submitted: "Đã gửi", review: "Đang xét duyệt",
    revision: "Yêu cầu bổ sung", passed: "Đạt", failed: "Không đạt"
};
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const REVIEWER_ROLES = ["admin", "reviewer"] as const;
export const PAGE_SIZE = 25;
