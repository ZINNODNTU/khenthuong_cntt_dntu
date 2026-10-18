import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { IMAGE_MIME_TYPES, EVIDENCE_MIME_TYPES } from "@/lib/constants";
import { env } from "@/lib/env";
import { uploadEvidence, StorageGatewayError } from "@/lib/apps-script-storage";
import { writeAudit } from "@/lib/audit";
import { detectEvidenceMime } from "@/lib/image-validation";
import { studentProfileComplete } from "@/lib/student-onboarding";
import { categoryCriterion, criterionFileLimit } from "@/lib/criterion-evidence";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { parseLimitedFormData, RequestTooLargeError } from "@/lib/request-limits";
import { enqueueStorageCleanup } from "@/lib/storage-cleanup";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("email,full_name,branch_code,submission_scope,phone,birth_date,profile_completed_at,role,is_active,must_change_password").eq("id", user.id).single();
    if (profile?.must_change_password)
        return NextResponse.json({ error: "Bạn phải đổi mật khẩu trước khi tải ảnh." }, { status: 403 });
    if (!profile?.is_active || profile.role !== "submitter")
        return NextResponse.json({ error: "Không có quyền tải ảnh" }, { status: 403 });
    if (profile.submission_scope === "individual" && (!user.email_confirmed_at || !studentProfileComplete(profile)))
        return NextResponse.json({ error: "Vui lòng hoàn thiện hồ sơ sinh viên và xác nhận email.", code: "PROFILE_INCOMPLETE" }, { status: 403 });
    const limit = await enforceRateLimit("upload:user", user.id, 100, 3600);
    if (!limit.allowed) return limit.response;
    const configuredMb = env.maxImageSizeMb();
    const maxFileBytes = Math.floor(Math.min(4, Math.max(1, Number.isFinite(configuredMb) ? configuredMb : 4)) * 1024 * 1024);
    let fd: FormData;
    try {
        fd = await parseLimitedFormData(request, maxFileBytes + 512 * 1024);
    } catch (error) {
        if (error instanceof RequestTooLargeError) return NextResponse.json({ error: "Yêu cầu tải tệp vượt hạn mức." }, { status: 413 });
        return NextResponse.json({ error: "Dữ liệu tải tệp không hợp lệ." }, { status: 400 });
    }
    const file = fd.get("file");
    const applicationId = String(fd.get("applicationId") || "");
    const applicationCode = String(fd.get("applicationCode") || "");
    const parentType = String(fd.get("parentType") || "");
    const parentId = String(fd.get("parentId") || "");
    const category = String(fd.get("category") || "main");
    const uploadKey = String(fd.get("uploadKey") || "").trim();
    const evidenceEntryId = String(fd.get("evidenceEntryId") || "").trim();
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    if (!/^[A-Za-z0-9:._-]{10,300}$/.test(uploadKey))
        return NextResponse.json({ error: "Khóa upload không hợp lệ" }, { status: 400 });
    if (!(file instanceof File))
        return NextResponse.json({ error: "Thiếu tệp minh chứng" }, { status: 400 });
    const criterionCode = categoryCriterion(category);
    const acceptedTypes: readonly string[] = criterionCode ? EVIDENCE_MIME_TYPES : IMAGE_MIME_TYPES;
    if (!acceptedTypes.includes(file.type))
        return NextResponse.json({ error: criterionCode ? "Chỉ nhận PDF, JPG, PNG hoặc WebP" : "Chỉ nhận JPG, PNG hoặc WebP" }, { status: 415 });
    if (!file.size || file.size > maxFileBytes)
        return NextResponse.json({ error: "Tệp vượt quá giới hạn tải lên (tối đa 4 MiB)." }, { status: 413 });
    const { data: app } = await supabase.from("applications").select("id,code,created_by,status,application_type").eq("id", applicationId).single();
    if (!app || app.created_by !== user.id || !["draft", "revision"].includes(app.status))
        return NextResponse.json({ error: "Không có quyền với hồ sơ" }, { status: 403 });
    if (app.application_type !== "individual")
        return NextResponse.json({ error: "Chỉ tiếp nhận minh chứng cho hồ sơ cá nhân." }, { status: 410 });
    if (applicationCode && applicationCode !== app.code)
        return NextResponse.json({ error: "Mã hồ sơ không khớp." }, { status: 400 });
    if (parentType === "application" && parentId !== applicationId)
        return NextResponse.json({ error: "Nội dung ảnh không hợp lệ" }, { status: 400 });
    if (category.startsWith("criterion_") && !criterionCode)
        return NextResponse.json({ error: "Mã tiêu chí không hợp lệ" }, { status: 400 });
    if (evidenceEntryId) {
        if (!/^[0-9a-f-]{36}$/i.test(evidenceEntryId) || !criterionCode) {
            return NextResponse.json({ error: "Mục thông tin minh chứng không hợp lệ." }, { status: 400 });
        }
        const { data: entry, error: entryError } = await supabase.from("evidence_entries")
            .select("id,application_id,criterion_code").eq("id", evidenceEntryId).maybeSingle();
        if (entryError || !entry || entry.application_id !== applicationId || entry.criterion_code !== criterionCode) {
            return NextResponse.json({ error: "Thông tin minh chứng chưa được lưu hoặc không thuộc tiêu chí." }, { status: 400 });
        }
    }
    if (criterionCode) {
        const { data: applicable, error: applicableError } = await supabase.from("application_criteria")
            .select("code").eq("application_id", applicationId).eq("code", criterionCode).maybeSingle();
        if (applicableError || !applicable) return NextResponse.json({ error: "Tiêu chí không thuộc hồ sơ này." }, { status: 400 });
        if (app.application_type === "individual" && criterionCode.startsWith("T"))
            return NextResponse.json({ error: "Tiêu chí tập thể không được áp dụng cho cá nhân." }, { status: 400 });
    }
    if (criterionCode && (parentType !== "application" || parentId !== applicationId))
        return NextResponse.json({ error: "Minh chứng phải thuộc hồ sơ và đúng tiêu chí" }, { status: 400 });
    if (!criterionCode && !["portrait", "main", "faculty", "university", "award"].includes(category))
        return NextResponse.json({ error: "Loại minh chứng không hợp lệ" }, { status: 400 });
    if (parentType === "activity") {
        const { data } = await supabase.from("activities").select("id").eq("id", parentId).eq("application_id", applicationId).single();
        if (!data)
            return NextResponse.json({ error: "Hoạt động không hợp lệ" }, { status: 400 });
    }
    if (parentType === "award") {
        const { data } = await supabase.from("prior_awards").select("id").eq("id", parentId).eq("application_id", applicationId).single();
        if (!data)
            return NextResponse.json({ error: "Khen thưởng không hợp lệ" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectEvidenceMime(buffer);
    if (!detected || detected !== file.type)
        return NextResponse.json({ error: "Nội dung tệp không đúng định dạng PDF/ảnh đã khai báo" }, { status: 415 });
    // A logical upload key identifies one immutable document. Keep the SHA-256
    // separate: appending it to the key would turn modified bytes into a NEW
    // upload and bypass conflict detection.
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const scopedUploadKey = createHash("sha256")
        .update(JSON.stringify([app.id, parentType, parentId, category, evidenceEntryId || null, uploadKey]))
        .digest("hex");
    const uploadLookup = await supabase.from("evidences").select("id,application_id,parent_type,parent_id,category,evidence_entry_id,file_name,mime_type,size_bytes,content_sha256,created_at").eq("upload_key", scopedUploadKey).eq("application_id", applicationId).eq("parent_type", parentType).eq("parent_id", parentId).eq("category", category).maybeSingle();
    if (uploadLookup.error)
        return NextResponse.json({ error: "Không thể kiểm tra tệp đã tải lên." }, { status: 503 });
    if (uploadLookup.data) {
        if (uploadLookup.data.size_bytes !== file.size || uploadLookup.data.mime_type !== detected ||
            uploadLookup.data.evidence_entry_id !== (evidenceEntryId || null) ||
            uploadLookup.data.content_sha256 !== sha256) {
            return NextResponse.json({ error: "Khóa tải lên đã được sử dụng với tài liệu khác." }, { status: 409 });
        }
        return NextResponse.json({ evidence: uploadLookup.data, reused: true }, { status: 200 });
    }
    const { data: dossierFiles, error: dossierError } = await supabase.from("evidences")
        .select("size_bytes").eq("application_id", applicationId);
    if (dossierError) return NextResponse.json({ error: "Không thể kiểm tra dung lượng hồ sơ." }, { status: 503 });
    if ((dossierFiles?.length || 0) >= 40)
        return NextResponse.json({ error: "Mỗi hồ sơ được tải tối đa 40 tệp." }, { status: 413 });
    if ((dossierFiles || []).reduce((sum, item) => sum + (Number(item.size_bytes) || 0), 0) + file.size > 60 * 1024 * 1024)
        return NextResponse.json({ error: "Tổng dung lượng minh chứng của hồ sơ tối đa 60 MiB." }, { status: 413 });
    if (category === "portrait") {
        const { count } = await supabase.from("evidences").select("id", { count: "exact", head: true }).eq("application_id", applicationId).eq("category", "portrait");
        if (count)
            return NextResponse.json({ error: "Hồ sơ chỉ được có 01 ảnh chân dung" }, { status: 400 });
    }
    if (criterionCode) {
        const { count, error: countError } = await supabase.from("evidences")
            .select("id", { count: "exact", head: true })
            .eq("application_id", applicationId).eq("category", category);
        if (countError) return NextResponse.json({ error: "Không thể kiểm tra số minh chứng" }, { status: 500 });
        if ((count || 0) >= criterionFileLimit(criterionCode)) {
            return NextResponse.json({ error: `${criterionCode}: Chỉ được tải tối đa ${criterionFileLimit(criterionCode)} minh chứng.` }, { status: 400 });
        }
    }
    let storageFileId = "";
    try {
        const storageStartedAt = Date.now();
        const uploaded = await uploadEvidence({ applicationCode: app.code, category, fileName: file.name, mimeType: detected, buffer, uploadKey: scopedUploadKey });
        const storageMs = Date.now() - storageStartedAt;
        storageFileId = uploaded.id;
        const baseRow = { application_id: applicationId, parent_type: parentType, parent_id: parentId, category, evidence_entry_id: evidenceEntryId || null, drive_file_id: uploaded.id, file_name: file.name, mime_type: detected, size_bytes: Number(uploaded.size || file.size), content_sha256: sha256, uploaded_by: user.id };
        let insertResult = await supabase.from("evidences").insert({ ...baseRow, upload_key: scopedUploadKey })
            .select("id,application_id,parent_type,parent_id,category,evidence_entry_id,file_name,mime_type,size_bytes,content_sha256,created_at").single();
        if (insertResult.error && (insertResult.error.code === "23505" || /upload_key/i.test(insertResult.error.message))) {
            const { data: duplicate } = await supabase.from("evidences")
                .select("id,application_id,parent_type,parent_id,category,evidence_entry_id,file_name,mime_type,size_bytes,content_sha256,created_at")
                .eq("upload_key", scopedUploadKey).eq("application_id", applicationId).eq("category", category).maybeSingle();
            if (duplicate && duplicate.mime_type === detected && duplicate.size_bytes === file.size &&
                duplicate.evidence_entry_id === (evidenceEntryId || null) && duplicate.content_sha256 === sha256) {
                return NextResponse.json({ evidence: duplicate, reused: true }, { status: 200 });
            }
            return NextResponse.json({
                error: "Khóa tải lên đã được sử dụng với tài liệu khác hoặc hồ sơ đã đạt giới hạn.",
                code: "EVIDENCE_CONFLICT",
            }, { status: 409 });
        }
        const { data, error } = insertResult;
        if (error) {
            const { data: existing } = await supabase.from("evidences").select("id,application_id,parent_type,parent_id,category,evidence_entry_id,file_name,mime_type,size_bytes,content_sha256,created_at").eq("drive_file_id", uploaded.id).eq("application_id", applicationId).eq("category", category).maybeSingle();
            if (existing && existing.content_sha256 === sha256 &&
                existing.evidence_entry_id === (evidenceEntryId || null) &&
                existing.parent_type === parentType && existing.parent_id === parentId &&
                existing.mime_type === detected && existing.size_bytes === file.size)
                return NextResponse.json({ evidence: existing, reused: true }, { status: 200 });
            throw error;
        }
        await writeAudit(supabase, user.id, "evidence.upload", "evidence", data.id, { applicationId, parentType, category });
        console.info("[evidence.upload.ok]", { requestId, applicationId, category, bytes: file.size, storageMs, totalMs: Date.now() - startedAt });
        return NextResponse.json({ evidence: data }, { status: 201 });
    }
    catch (error) {
        if (storageFileId) {
            try {
                // Delay cleanup: a concurrent idempotent upload may still be committing metadata.
                await enqueueStorageCleanup(storageFileId, 5 * 60 * 1000);
                console.warn("[evidence.upload.orphan_queued]", { requestId });
            } catch (cleanupError) {
                console.error("[evidence.upload.cleanup_queue_failed]", { requestId, reason: cleanupError instanceof Error ? cleanupError.name : "unknown" });
            }
        }
        console.error("[evidence.upload]", {
            requestId,
            applicationId,
            category,
            parentType,
            totalMs: Date.now() - startedAt,
            code: error instanceof StorageGatewayError ? error.code : error instanceof Error ? error.name : "unknown",
        });
        if (error instanceof Error && /DOSSIER_(FILE|SIZE)_QUOTA_EXCEEDED/.test(error.message))
            return NextResponse.json({ error: "Hồ sơ vượt hạn mức 40 tệp hoặc 60 MiB minh chứng." }, { status: 413 });
        if (error instanceof StorageGatewayError) {
            return NextResponse.json({ error: error.message, code: error.code },
                { status: error.code === "STORAGE_BUSY" ? 503 : error.code === "STORAGE_CONTENT_MISMATCH" ? 409 : 502 });
        }
        return NextResponse.json({ error: "Không thể lưu minh chứng. Vui lòng thử lại hoặc liên hệ quản trị." }, { status: 500 });
    }
}