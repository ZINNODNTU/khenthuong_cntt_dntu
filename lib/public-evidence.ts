import { env } from "@/lib/env";
import type { Evidence } from "@/lib/types";
export function getPublicEvidenceUrl(evidence: Pick<Evidence, "id" | "public_token" | "public_view_enabled">) {
    if (evidence.public_view_enabled && evidence.public_token) {
        const viewer = env.googleAppsScriptWebAppUrl();
        const separator = viewer.includes("?") ? "&" : "?";
        return `${viewer}${separator}token=${encodeURIComponent(evidence.public_token)}`;
    }
    return `/api/evidence/${evidence.id}`;
}

