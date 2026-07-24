import { env } from "@/lib/env";
import type { Evidence } from "@/lib/types";
export function getPublicEvidenceUrl(evidence: Pick<Evidence, "id" | "public_token" | "public_view_enabled">) {
    if (evidence.public_view_enabled && evidence.public_token) {
        try {
            const viewer = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL || env.googleAppsScriptWebAppUrl();
            if (viewer) {
                const separator = viewer.includes("?") ? "&" : "?";
                return `${viewer}${separator}token=${encodeURIComponent(evidence.public_token)}`;
            }
        } catch { /* fallback to internal URL */ }
    }
    return `/api/evidence/${evidence.id}`;
}

