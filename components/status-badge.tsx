import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge status={status} />;
}
