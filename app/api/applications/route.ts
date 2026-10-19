import { NextResponse } from "next/server";
import { getAwardCriteria } from "@/lib/award-criteria-scope";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationSchema } from "@/lib/validation";
import { makeApplicationCode } from "@/lib/application-code";
import { writeAudit } from "@/lib/audit";
import { studentIdFromDntuEmail } from "@/lib/identity";
import { studentProfileComplete } from "@/lib/student-onboarding";
import { enforceRateLimit } from "@/lib/security-rate-limit";
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { data: profile } = await supabase
        .from("profiles")
        .select("email,role,submission_scope,branch_code,club_id,is_active,must_change_password,full_name,phone,birth_date,profile_completed_at")
        .eq("id", user.id)
        .single();
    if (profile?.must_change_password) {
        return NextResponse.json({ error: "Bạn phải đổi mật khẩu trước khi nộp hồ sơ." }, { status: 403 });
    }
    if (!profile?.is_active || profile.role !== "submitter") {
        return NextResponse.json({ error: "Tài khoản không có quyền nộp hồ sơ" }, { status: 403 });
    }
    if (profile.submission_scope === "individual" && (!user.email_confirmed_at || !studentProfileComplete(profile))) {
        return NextResponse.json({ error: "Vui lòng xác minh email trường và hoàn thiện hồ sơ trước khi nộp xét.", code: "PROFILE_INCOMPLETE" }, { status: 403 });
    }
    if (profile.submission_scope !== "individual") {
        return NextResponse.json({ error: "Hệ thống chỉ tiếp nhận hồ sơ khen thưởng cá nhân Đoàn – Hội." }, { status: 403 });
    }
    const limit = await enforceRateLimit("application:create", user.id, 15, 3600);
    if (!limit.allowed) return limit.response;
    const parsed = applicationSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
    }
    const payload = parsed.data;
    const studentId = studentIdFromDntuEmail(profile.email);
    if (!studentId) {
        return NextResponse.json({
            error: "Email tài khoản sinh viên phải có dạng MSSV@dntu.edu.vn.",
        }, { status: 403 });
    }
    const { data: period } = await supabase
        .from("evaluation_periods")
        .select("id,status,starts_at,ends_at,evidence_starts_on,evidence_ends_on,allow_individual,allow_branch_collective,allow_club_collective")
        .eq("id", payload.evaluationPeriodId)
        .single();
    const now = Date.now();
    if (!period || period.status !== "open" || now < new Date(period.starts_at).getTime() || now > new Date(period.ends_at).getTime()) {
        return NextResponse.json({ error: "Đợt xét hiện không nhận hồ sơ" }, { status: 400 });
    }
    const today = new Date();
    const latestAdultBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    if (profile.birth_date && new Date(`${profile.birth_date}T00:00:00`) > latestAdultBirthDate) {
        return NextResponse.json({ error: "Người nộp hồ sơ phải đủ 18 tuổi." }, { status: 400 });
    }
    const outsideEvidenceRange = (date: string) => date && (date < period.evidence_starts_on || date > period.evidence_ends_on);
    if (payload.activities.some((activity) => outsideEvidenceRange(activity.activityDate))) {
        return NextResponse.json({ error: `Ngày hoạt động phải từ ${period.evidence_starts_on} đến ${period.evidence_ends_on}.` }, { status: 400 });
    }
    if (payload.priorAwards.some((award) => outsideEvidenceRange(award.issuedDate))) {
        return NextResponse.json({ error: `Ngày cấp khen thưởng phải từ ${period.evidence_starts_on} đến ${period.evidence_ends_on}.` }, { status: 400 });
    }
    if (!profile.branch_code || payload.branchCode !== profile.branch_code || !period.allow_individual) {
        return NextResponse.json({ error: "Tài khoản không được nộp hồ sơ cá nhân trong đợt này." }, { status: 403 });
    }
    const branchCode = profile.branch_code;
    const clubId = null;
    const collectiveType = null;
    if (branchCode) {
        const { data: branch } = await supabase
            .from("branches")
            .select("code")
            .eq("code", branchCode)
            .eq("is_active", true)
            .single();
        if (!branch)
            return NextResponse.json({ error: "Chi đoàn đã ngừng sử dụng" }, { status: 400 });
    }
    const existingQuery = supabase
        .from("applications")
        .select("id,code,status")
        .eq("evaluation_period_id", payload.evaluationPeriodId)
        .eq("application_type", "individual")
        .eq("created_by", user.id);
    const { data: existingRows } = await existingQuery.limit(1);
    const existing = existingRows?.[0];
    if (existing) {
        return NextResponse.json({
            error: "Đối tượng đã có hồ sơ trong đợt xét này. Hãy mở hồ sơ hiện có để tiếp tục.",
            existingApplicationId: existing.id,
            existingCode: existing.code,
            existingStatus: existing.status,
        }, { status: 409 });
    }
    const code = makeApplicationCode();
    const { data: application, error } = await supabase
        .from("applications")
        .insert({
        code,
        evaluation_period_id: payload.evaluationPeriodId,
        application_type: "individual",
        collective_type: collectiveType,
        branch_code: branchCode,
        club_id: clubId,
        subject_name: payload.subjectName,
        student_id: studentId,
        birth_date: profile.birth_date,
        position: payload.position || null,
        phone: payload.phone || null,
        email: profile.email,
        achievements: payload.achievements,
        role_contribution: payload.roleContribution || null,
        targets_result: payload.targetsResult || null,
        initiatives: payload.initiatives || null,
        impact: payload.impact || null,
        summary: payload.summary || null,
        status: "draft",
        submitted_at: null,
        created_by: user.id,
    })
        .select()
        .single();
    if (error || !application) {
        const duplicate = error?.message.toLowerCase().includes("đã có hồ sơ");
        return NextResponse.json({ error: duplicate ? "Đối tượng đã có hồ sơ trong đợt xét này." : error?.message || "Không thể tạo hồ sơ" }, { status: duplicate ? 409 : 400 });
    }
    const admin = createAdminClient();
    async function cleanupDraft() {
        await admin.from("applications").delete().eq("id", application.id).eq("status", "draft");
    }
    const activityMap: Record<string, string> = {};
    const awardMap: Record<string, string> = {};
    if (payload.activities.length) {
        const { data, error: activityError } = await supabase
            .from("activities")
            .insert(payload.activities.map((activity) => ({
            application_id: application.id,
            client_key: activity.clientKey,
            level: activity.level,
            name: activity.name,
            organizer: activity.organizer || null,
            activity_date: activity.activityDate || null,
            role: activity.role || null,
            result: activity.result || null,
            contribution: activity.contribution || null,
        })))
            .select("id,client_key");
        if (activityError) {
            await cleanupDraft();
            return NextResponse.json({ error: activityError.message }, { status: 400 });
        }
        data?.forEach((item) => { activityMap[item.client_key] = item.id; });
    }
    if (payload.priorAwards.length) {
        const { data, error: awardError } = await supabase
            .from("prior_awards")
            .insert(payload.priorAwards.map((award) => ({
            application_id: application.id,
            client_key: award.clientKey,
            award_type: award.awardType,
            title: award.title,
            decision_number: award.decisionNumber,
            issued_date: award.issuedDate || null,
            issuer: award.issuer,
        })))
            .select("id,client_key");
        if (awardError) {
            await cleanupDraft();
            return NextResponse.json({ error: awardError.message }, { status: 400 });
        }
        data?.forEach((item) => { awardMap[item.client_key] = item.id; });
    }
    const individualCriteria = [
        { code: "C1", title: "Mức độ đóng góp nổi bật cho công tác Đoàn – Hội và phong trào thanh niên", value_text: payload.achievements, evidence_note: "Báo cáo thành tích và minh chứng hoạt động" },
        { code: "C2", title: "Vai trò trực tiếp trong tổ chức, điều phối hoặc phụ trách hoạt động", value_text: payload.roleContribution, evidence_note: "Vai trò trong hoạt động" },
        { code: "C3", title: "Thành tích cụ thể được ghi nhận", value_text: `${payload.priorAwards.length} thành tích`, evidence_note: "Giấy khen, chứng nhận, quyết định" },
        { code: "C4", title: "Mức độ tham gia thường xuyên, tích cực", value_text: `${payload.activities.length} hoạt động`, evidence_note: "Danh sách hoạt động và ảnh minh chứng" },
        { code: "C5", title: "Vai trò cán bộ Đoàn – Hội, CLB/đội/nhóm", value_text: payload.position || payload.roleContribution, evidence_note: "Chức vụ và kết quả hoàn thành nhiệm vụ" },
        { code: "C6", title: "Sáng kiến, mô hình, giải pháp hoặc khả năng lan tỏa", value_text: payload.initiatives, evidence_note: payload.impact, },
        { code: "C7", title: "Kết quả rèn luyện đạt loại Tốt trở lên", value_text: payload.conductRating, evidence_note: "Kết quả rèn luyện năm học" },
        { code: "C8", title: "ĐTB tích lũy từ 2,80/4,00 trở lên", numeric_value: payload.cumulativeGpa, evidence_note: "Bảng điểm/giấy xác nhận" },
        { code: "C9", title: "Cam kết chấp hành kỷ luật và quy chế Nhà trường", boolean_value: false, value_text: null, evidence_note: "Chờ sinh viên tích cam kết khi gửi hồ sơ" },
    ];
    const criteria = individualCriteria.map(item => ({
        code: item.code as import("@/lib/types").CriterionCode,
        title: getAwardCriteria("individual").find(c => c.code === item.code)!.title,
        application_id: application.id,
        value_text: "value_text" in item ? item.value_text ?? null : null,
        numeric_value: "numeric_value" in item ? item.numeric_value ?? null : null,
        boolean_value: "boolean_value" in item ? item.boolean_value ?? null : null,
        evidence_note: item.evidence_note ?? null,
    }));
    if (criteria.length) {
        const { error: criteriaError } = await admin.from("application_criteria").insert(criteria);
        if (criteriaError) {
          await cleanupDraft();
          return NextResponse.json({ error: "Không thể khởi tạo bộ tiêu chí của hồ sơ cá nhân." }, { status: 400 });
        }
    }
    await writeAudit(supabase, user.id, "application.create", "application", application.id, {
        code,
        evaluationPeriodId: payload.evaluationPeriodId,
        applicationType: "individual",
        collectiveType,
    });
    return NextResponse.json({ application, activityMap, awardMap }, { status: 201 });
}

