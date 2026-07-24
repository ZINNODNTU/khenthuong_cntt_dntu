import type { LucideIcon } from "lucide-react";
import { STATUS_LABEL, type ApplicationStatus } from "@/lib/constants";

type StatusVariant = "gray" | "blue" | "green" | "yellow" | "red";

const statusMap: Record<ApplicationStatus, { label: string; variant: StatusVariant }> = {
  draft: { label: STATUS_LABEL.draft, variant: "gray" },
  submitted: { label: STATUS_LABEL.submitted, variant: "blue" },
  review: { label: STATUS_LABEL.review, variant: "blue" },
  revision: { label: STATUS_LABEL.revision, variant: "yellow" },
  passed: { label: STATUS_LABEL.passed, variant: "green" },
  failed: { label: STATUS_LABEL.failed, variant: "red" },
};

const variantClass: Record<StatusVariant, string> = {
  gray: "badge-gray",
  blue: "badge-blue",
  green: "badge-green",
  yellow: "badge-yellow",
  red: "badge-red",
};

export function Badge({
  status,
  icon: Icon,
}: {
  status: ApplicationStatus;
  icon?: LucideIcon;
}) {
  const s = statusMap[status];
  return (
    <span className={`badge ${variantClass[s.variant]}`}>
      {Icon && <Icon size={12} />}
      {s.label}
    </span>
  );
}
