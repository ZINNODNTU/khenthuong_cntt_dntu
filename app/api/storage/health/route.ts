import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkStorageHealth, StorageGatewayError } from "@/lib/apps-script-storage";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Admin-only readiness probe. A reachable Apps Script is NOT sufficient:
 * new statement uploads require migrations 06/07 and checksum migration 09,
 * and new collective T-codes require migration 08 (verified on staging).
 */
export async function GET() {
    await requireRole(["admin"]);
    const missing: string[] = [];
    let folderName: string | undefined;
    let version: string | undefined;
    let gatewayCode: string | undefined;

    try {
        const admin = createAdminClient();
        const checks = await Promise.all([
            admin.from("evidence_entries").select("id", { head: true, count: "exact" }).limit(0),
            admin.from("evidences").select("evidence_entry_id", { head: true }).limit(0),
            admin.from("storage_cleanup_queue").select("id", { head: true }).limit(0),
            admin.from("evidences").select("upload_key", { head: true }).limit(0),
            admin.from("evidences").select("content_sha256", { head: true }).limit(0),
        ]);
        for (let i = 0; i < checks.length; i++) {
            if (checks[i].error) {
                missing.push(["public.evidence_entries", "public.evidences.evidence_entry_id", "public.storage_cleanup_queue", "public.evidences.upload_key", "public.evidences.content_sha256"][i]);
            }
        }
    } catch {
        missing.push("Kết nối Supabase bằng khóa máy chủ");
    }

    try {
        const health = await checkStorageHealth();
        folderName = health.rootFolderName;
        version = health.version;
        if (!version.startsWith("2.")) {
            gatewayCode = "STORAGE_VERSION_OUTDATED";
        }
    } catch (error) {
        gatewayCode = error instanceof StorageGatewayError ? error.code : "STORAGE_UNAVAILABLE";
        console.error("[storage.health.gateway]", { code: gatewayCode });
    }

    const ok = !missing.length && !gatewayCode;
    const message = ok ? "Google Drive và cơ sở dữ liệu minh chứng đã sẵn sàng."
        : [
            missing.length ? "Supabase thiếu: " + missing.join(", ") + "." : "",
            gatewayCode === "STORAGE_VERSION_OUTDATED" ? "Hãy triển khai Apps Script phiên bản 2.x."
                : gatewayCode ? "Không thể xác minh Apps Script: " + gatewayCode + "." : "",
        ].filter(Boolean).join(" ");
    return NextResponse.json({
        ok, message, folderName, version,
        code: missing.length ? "STORAGE_DATABASE_NOT_READY" : gatewayCode,
        schemaReady: !missing.length,
        gatewayReady: !gatewayCode,
    }, {
        status: ok ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
    });
}
