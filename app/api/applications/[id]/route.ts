import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

import { createAdminClient } from "@/lib/supabase/admin";
import { validateCriteria } from "@/lib/criteria-rules";
import { validateCriterionEvidence } from "@/lib/criterion-evidence";
import { validateEvidenceEntryLedger } from "@/lib/evidence-entry-rules";
import type { ApplicationCriterion } from "@/lib/types";
import { studentProfileComplete } from "@/lib/student-onboarding";
const schema = z.object({
    achievements: z.string().trim().min(1, "Hãy nhập thành tích nổi bật.").max(15000),
    summary: z.string().max(8000).optional().default(""),
    resubmit: z.boolean().default(false),
    conductRating: z.enum(["Xuất sắc", "Tốt", "Khá", "Trung bình", "Yếu"]).nullable().optional(),
    cumulativeGpa: z.number().min(0).max(4).nullable().optional(),
    disciplinaryStatus: z.enum(["none", "warning", "reprimand_or_higher"]).optional(),
    disciplinaryNote: z.string().max(3000).optional(),
});
export async function PATCH(request: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { data: profile } = await supabase
        .from("profiles")
        .select("email,full_name,phone,birth_date,profile_completed_at,role,submission_scope,branch_code,club_id,is_active,must_change_password")
        .eq("id", user.id)
        .single();
    if (profile?.must_change_password) {
        return NextResponse.json({ error: "Bạn phải đổi mật khẩu trước khi cập nhật hồ sơ." }, { status: 403 });
    }
    if (!profile?.is_active || profile.role !== "submitter") {
        return NextResponse.json({ error: "Không có quyền cập nhật hồ sơ" }, { status: 403 });
    }
    if (profile.submission_scope === "individual" && (!user.email_confirmed_at || !studentProfileComplete(profile))) {
        return NextResponse.json({ error: "Vui lòng hoàn thiện hồ sơ sinh viên và xác nhận email.", code: "PROFILE_INCOMPLETE" }, { status: 403 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { data: app } = await supabase
        .from("applications")
        .select("id,created_by,status,application_type,collective_type,branch_code,club_id,evaluation_period_id")
        .eq("id", id)
        .single();
    if (app && app.application_type !== "individual") {
        return NextResponse.json({ error: "Hồ sơ tập thể lịch sử chỉ được lưu trữ, không tiếp tục xét." }, { status: 410 });
    }
    const ownsScope = app?.application_type === "individual"
        ? profile.submission_scope === "individual" && app.branch_code === profile.branch_code
        : app?.collective_type === "branch"
            ? profile.submission_scope === "branch" && app.branch_code === profile.branch_code
            : profile.submission_scope === "club" && app?.club_id === profile.club_id;
    if (!app || app.created_by !== user.id || !ownsScope || !["draft", "revision"].includes(app.status)) {
        return NextResponse.json({ error: "Hồ sơ không được phép chỉnh sửa" }, { status: 403 });
    }
    // Refresh criterion snapshots only after the owner/scope/status guard.
    const { data: collectiveT1, error: schemeError } = app.application_type === "collective"
        ? await supabase.from("application_criteria").select("code")
            .eq("application_id", id).eq("code", "T1").maybeSingle()
        : { data: null, error: null };
    if (schemeError) return NextResponse.json({ error: "Không thể kiểm tra bộ tiêu chí của hồ sơ." }, { status: 503 });
    const criterionUpdates: { code: string; values: Record<string, unknown> }[] =
        app.application_type === "collective" && collectiveT1 ? []
            : [{ code: "C1", values: { value_text: parsed.data.achievements } }];
    if (app.application_type === "individual") {
        if (parsed.data.conductRating !== undefined) criterionUpdates.push({
            code: "C7", values: { value_text: parsed.data.conductRating },
        });
        if (parsed.data.cumulativeGpa !== undefined) criterionUpdates.push({
            code: "C8", values: { numeric_value: parsed.data.cumulativeGpa },
        });
        if (parsed.data.disciplinaryStatus !== undefined) criterionUpdates.push({
            code: "C9", values: {
                value_text: parsed.data.disciplinaryStatus,
                boolean_value: parsed.data.disciplinaryStatus === "none",
                evidence_note: parsed.data.disciplinaryNote || null,
            },
        });
    }
    const adminForCriteria = createAdminClient();
    for (const item of criterionUpdates) {
        const { data, error } = await adminForCriteria.from("application_criteria")
            .update({
                ...item.values, status: "pending",
                verified_by: null, verified_at: null, reviewer_note: null,
            })
            .eq("application_id", id).eq("code", item.code).select("code");
        if (error || data?.length !== 1) {
            return NextResponse.json({ error: "Dữ liệu tiêu chí chưa được khởi tạo hoặc không thể cập nhật. Liên hệ quản trị viên." }, { status: 409 });
        }
    }

    if (parsed.data.resubmit) {
        const { data: period } = await supabase
            .from("evaluation_periods")
            .select("status,starts_at,ends_at")
            .eq("id", app.evaluation_period_id)
            .single();
        const now = Date.now();
        if (!period || period.status !== "open" || now < new Date(period.starts_at).getTime() || now > new Date(period.ends_at).getTime()) {
            return NextResponse.json({ error: "Đợt xét đã đóng hoặc chưa bắt đầu. Không thể gửi hồ sơ." }, { status: 400 });
        }
        const [evidenceResult, activityResult, awardResult, entryResult] = await Promise.all([
            supabase.from("evidences").select("id,category,parent_type,evidence_entry_id").eq("application_id", id),
            supabase.from("activities").select("name").eq("application_id", id),
            supabase.from("prior_awards").select("title,decision_number,issuer").eq("application_id", id),
            supabase.from("evidence_entries").select("id,criterion_code,title").eq("application_id", id),
        ]);
        if (evidenceResult.error || activityResult.error || awardResult.error || entryResult.error) {
            return NextResponse.json({ error: "Không thể kiểm tra tính đầy đủ của hồ sơ" }, { status: 400 });
        }
        const { data: criteria, error: criteriaError } = await supabase.from("application_criteria")
            .select("code,status,value_text,numeric_value,boolean_value").eq("application_id", id);
        if (criteriaError) return NextResponse.json({ error: "Không thể kiểm tra tiêu chí của hồ sơ" }, { status: 400 });
        const issues = validateCriteria((criteria || []) as ApplicationCriterion[], app.application_type, "submit");
        if (issues.length) return NextResponse.json({ error: issues.join(" ") }, { status: 400 });
        const evidences = evidenceResult.data || [];
        const entryIssues = validateEvidenceEntryLedger(entryResult.data || [], evidences, app.application_type, (criteria || []).map(row => row.code));
        if (entryIssues.length) return NextResponse.json({ error: entryIssues.join(" ") }, { status: 400 });
        const evidenceIssues = validateCriterionEvidence(evidences.map(row => row.category), app.application_type, (criteria || []).map(row => row.code));
        if (evidenceIssues.length) return NextResponse.json({ error: evidenceIssues.join(" ") }, { status: 400 });
        if (!evidences.length) {
            return NextResponse.json({ error: "Hồ sơ phải có ít nhất 01 ảnh minh chứng" }, { status: 400 });
        }
        if (app.application_type === "individual") {
            const hasPortrait = evidences.some((item) => item.parent_type === "application" && item.category === "portrait");
            if (!hasPortrait) {
                return NextResponse.json({ error: "Hồ sơ cá nhân phải có ảnh chân dung" }, { status: 400 });
            }
        }
        const invalidActivity = (activityResult.data || []).some((item) => item.name.trim().length < 3);
        if (invalidActivity) {
            return NextResponse.json({ error: "Có hoạt động chưa nhập tên hợp lệ" }, { status: 400 });
        }
        const invalidAward = (awardResult.data || []).some((item) => item.title.trim().length < 3 || !item.decision_number.trim() || item.issuer.trim().length < 2);
        if (invalidAward) {
            return NextResponse.json({ error: "Có thành tích khen thưởng chưa đủ tên, số quyết định/GCN hoặc đơn vị trao tặng" }, { status: 400 });
        }
    }
    const values: Record<string, unknown> = {
        achievements: parsed.data.achievements,
        summary: parsed.data.summary || null,
    };
    if (parsed.data.resubmit) {
        values.status = "submitted";
    }
    const { error } = await supabase.from("applications").update(values).eq("id", id);
    if (error) {
        const duplicate = error.message.toLowerCase().includes("đã có hồ sơ");
        return NextResponse.json({ error: duplicate ? "Đối tượng đã có một hồ sơ trong đợt xét này." : error.message }, { status: duplicate ? 409 : 400 });
    }
    await writeAudit(supabase, user.id, parsed.data.resubmit ? "application.submit" : "application.supplement", "application", id, {});
    return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ confirmationCode: z.string().max(100).optional().default("") });

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role,is_active,must_change_password").eq("id", user.id).single();
    if (profile?.must_change_password || !profile?.is_active) return NextResponse.json({ error: "Tài khoản không được phép xóa hồ sơ" }, { status: 403 });
    const parsed = deleteSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Dữ liệu xác nhận không hợp lệ" }, { status: 400 });
    const admin = createAdminClient();
    const { data: application } = await admin.from("applications").select("id,code,subject_name,status,created_by").eq("id", id).maybeSingle();
    if (!application) return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });
    const isAdmin = profile.role === "admin";
    const ownerCanDelete = profile.role === "submitter" && application.created_by === user.id && application.status === "draft";
    if (!isAdmin && !ownerCanDelete) return NextResponse.json({ error: "Bạn chỉ được xóa hồ sơ nháp của mình" }, { status: 403 });
    if (isAdmin && application.status !== "draft" && parsed.data.confirmationCode !== application.code) {
        return NextResponse.json({ error: `Nhập đúng mã ${application.code} để xác nhận xóa.` }, { status: 400 });
    }
    const { data: evidences, error: evidencesError } = await admin.from("evidences").select("drive_file_id").eq("application_id", id);
    if (evidencesError) return NextResponse.json({ error: "Không thể lập danh sách tệp cần dọn." }, { status: 503 });
    await writeAudit(supabase, user.id, "application.delete", "application", id, { code: application.code, subjectName: application.subject_name, status: application.status, evidenceCount: evidences?.length || 0 });
    // Persist all cleanup intentions in a single database request. If dossier
    // deletion fails, the cron worker sees the still-referenced evidence and
    // cancels cleanup. No Drive operation runs in this HTTP request.
    const cleanupRows = [...new Set((evidences || []).map(row => row.drive_file_id))]
        .map(drive_file_id => ({ drive_file_id, next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString() }));
    if (cleanupRows.length) {
        const { error: queueError } = await admin.from("storage_cleanup_queue")
            .upsert(cleanupRows, { onConflict: "drive_file_id" });
        if (queueError) return NextResponse.json({ error: "Không thể đưa minh chứng vào hàng đợi xóa an toàn." }, { status: 503 });
    }
    const { error } = await admin.from("applications").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Không thể xóa hồ sơ" }, { status: 400 });
    return NextResponse.json({ ok: true, cleanupQueued: cleanupRows.length });
}