import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { detectEvidenceMime } from "@/lib/image-validation";
import { createClient } from "@/lib/supabase/server";
import { downloadEvidence } from "@/lib/apps-script-storage";

import { enforceRateLimit } from "@/lib/security-rate-limit";
export const runtime = "nodejs";
export const maxDuration = 60;

// Only the owner may remove evidence while a dossier is still editable.
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles")
        .select("role,is_active,must_change_password")
        .eq("id", user.id).maybeSingle();
    if (!profile?.is_active || profile.must_change_password || profile.role !== "submitter")
        return NextResponse.json({ error: "Không có quyền xóa minh chứng." }, { status: 403 });
    const { data: evidence } = await supabase.from("evidences")
        .select("id,application_id,category,drive_file_id").eq("id", id).maybeSingle();
    if (!evidence || !(evidence.category.startsWith("criterion_") || evidence.category === "portrait"))
        return NextResponse.json({ error: "Không tìm thấy minh chứng có thể xóa." }, { status: 404 });
    const { data: app } = await supabase.from("applications")
        .select("created_by,status").eq("id", evidence.application_id).maybeSingle();
    if (app?.created_by !== user.id || !["draft", "revision"].includes(app.status))
        return NextResponse.json({ error: "Không có quyền xóa minh chứng." }, { status: 403 });
    const { data: deletedDriveId, error } = await supabase.rpc("delete_owned_evidence", { p_evidence_id: id });
    if (error || !deletedDriveId) return NextResponse.json({ error: "Không thể xóa minh chứng trong hồ sơ." }, { status: 403 });
    // The RPC atomically deletes the metadata and queues Drive cleanup.
    // Do not block the user on Google Apps Script latency or transient outages.
    return NextResponse.json({ ok: true, cleanupQueued: Boolean(deletedDriveId) });
}
export async function GET(_: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return new NextResponse("Unauthorized", { status: 401 });
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_active,must_change_password,role")
        .eq("id", user.id)
        .maybeSingle();
    if (!profile?.is_active)
        return new NextResponse("Forbidden", { status: 403 });
    if (profile.must_change_password)
        return new NextResponse("Password change required", { status: 403 });
    const limit = await enforceRateLimit("download:user", user.id, 600, 3600);
    if (!limit.allowed) return limit.response;
    const { data: evidence } = await supabase
        .from("evidences")
        .select("drive_file_id,mime_type,file_name,application_id,content_sha256")
        .eq("id", id)
        .single();
    if (!evidence)
        return new NextResponse("Not found", { status: 404 });
    if (profile.role === "reviewer") {
        const { data: app } = await supabase.from("applications")
            .select("reviewer_id").eq("id", evidence.application_id).maybeSingle();
        if (!app || app.reviewer_id !== user.id) return new NextResponse("Forbidden", { status: 403 });
    }
    try {
        const downloaded = await downloadEvidence(evidence.drive_file_id);
        const buffer = Buffer.from(downloaded.base64, "base64");
        // Even if Drive contents change after the metadata is written, never
        // serve a mismatched or non-supported document to a signed-in user.
        const digest = createHash("sha256").update(buffer).digest("hex");
        if (!buffer.length || buffer.length > 4 * 1024 * 1024 ||
            buffer.length !== downloaded.size ||
            detectEvidenceMime(buffer) !== evidence.mime_type ||
            (downloaded.sha256 && digest !== downloaded.sha256) ||
            // The database digest is independent of the Drive gateway response.
            // Older evidence predating this migration may legitimately have null.
            (evidence.content_sha256 && digest !== evidence.content_sha256)) {
            console.error("[evidence.download.integrity_failed]", { evidenceId: id });
            return new NextResponse("Minh chứng không vượt qua kiểm tra toàn vẹn.", { status: 502 });
        }
        return new NextResponse(buffer, {
            headers: {
                "content-type": evidence.mime_type || downloaded.mimeType,
                "content-disposition": `${evidence.mime_type === "application/pdf" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(evidence.file_name || downloaded.fileName)}`,
                "cache-control": "private, no-store, max-age=0",
                "x-content-type-options": "nosniff"
            }
        });
    }
    catch (error) {
        console.error("[evidence.download.failed]", { evidenceId: id, reason: error instanceof Error ? error.name : "unknown" });
        return new NextResponse("Không thể tải ảnh minh chứng", { status: 502 });
    }
}