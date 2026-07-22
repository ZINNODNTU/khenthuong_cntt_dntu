import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IMAGE_MIME_TYPES } from "@/lib/constants";
import { env } from "@/lib/env";
import { uploadEvidence, deleteEvidence, StorageGatewayError } from "@/lib/apps-script-storage";
import { writeAudit } from "@/lib/audit";
import { detectImageMime } from "@/lib/image-validation";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role,is_active,must_change_password").eq("id", user.id).single();
    if (profile?.must_change_password)
        return NextResponse.json({ error: "Bạn phải đổi mật khẩu trước khi tải ảnh." }, { status: 403 });
    if (!profile?.is_active || profile.role !== "submitter")
        return NextResponse.json({ error: "Không có quyền tải ảnh" }, { status: 403 });
    const fd = await request.formData();
    const file = fd.get("file");
    const applicationId = String(fd.get("applicationId") || "");
    const applicationCode = String(fd.get("applicationCode") || "");
    const parentType = String(fd.get("parentType") || "");
    const parentId = String(fd.get("parentId") || "");
    const category = String(fd.get("category") || "main");
    if (!(file instanceof File))
        return NextResponse.json({ error: "Thiếu ảnh" }, { status: 400 });
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type))
        return NextResponse.json({ error: "Chỉ nhận JPG, PNG hoặc WebP" }, { status: 415 });
    if (file.size > env.maxImageSizeMb() * 1024 * 1024)
        return NextResponse.json({ error: `Ảnh vượt quá ${env.maxImageSizeMb()} MB` }, { status: 413 });
    const { data: app } = await supabase.from("applications").select("id,code,created_by,status").eq("id", applicationId).single();
    if (!app || app.created_by !== user.id || !["draft", "revision"].includes(app.status))
        return NextResponse.json({ error: "Không có quyền với hồ sơ" }, { status: 403 });
    if (parentType === "application" && parentId !== applicationId)
        return NextResponse.json({ error: "Nội dung ảnh không hợp lệ" }, { status: 400 });
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
    if (category === "portrait") {
        const { count } = await supabase.from("evidences").select("id", { count: "exact", head: true }).eq("application_id", applicationId).eq("category", "portrait");
        if (count)
            return NextResponse.json({ error: "Hồ sơ chỉ được có 01 ảnh chân dung" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImageMime(buffer);
    if (!detected || detected !== file.type)
        return NextResponse.json({ error: "Nội dung tệp không đúng định dạng ảnh đã khai báo" }, { status: 415 });
    let storageFileId = "";
    try {
        const uploaded = await uploadEvidence({ applicationCode: applicationCode || app.code, category, fileName: file.name, mimeType: detected, buffer });
        storageFileId = uploaded.id;
        const { data, error } = await supabase.from("evidences").insert({ application_id: applicationId, parent_type: parentType, parent_id: parentId, category, drive_file_id: uploaded.id, file_name: uploaded.name || file.name, mime_type: detected, size_bytes: Number(uploaded.size || file.size), uploaded_by: user.id }).select().single();
        if (error)
            throw error;
        await writeAudit(supabase, user.id, "evidence.upload", "evidence", data.id, { applicationId, parentType, category });
        return NextResponse.json({ evidence: data }, { status: 201 });
    }
    catch (error) {
        if (storageFileId)
            await deleteEvidence(storageFileId);
        console.error("[evidence.upload]", {
            applicationId,
            category,
            parentType,
            error,
        });
        if (error instanceof StorageGatewayError) {
            return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
        }
        return NextResponse.json({ error: error instanceof Error ? error.message : "Tải ảnh thất bại" }, { status: 500 });
    }
}

