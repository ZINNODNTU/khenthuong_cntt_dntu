import { STATUS_LABEL, type ApplicationStatus } from "@/lib/constants";
export function StatusBadge({ status }: {
    status: ApplicationStatus;
}) { return <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>; }

