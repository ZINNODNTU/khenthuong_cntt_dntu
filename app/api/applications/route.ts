import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationSchema } from "@/lib/validation";
import { makeApplicationCode } from "@/lib/application-code";
import { writeAudit } from "@/lib/audit";
import { studentIdFromDntuEmail } from "@/lib/identity";
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { data: profile } = await supabase
        .from("profiles")
        .select("email,role,submission_scope,branch_code,club_id,is_active,must_change_password")
        .eq("id", user.id)
        .single();
    if (profile?.must_change_password) {
        return NextResponse.json({ error: "Bạn phải đổi mật khẩu trước khi nộp hồ sơ." }, { status: 403 });
    }
    if (!profile?.is_active || profile.role !== "submitter") {
        return NextResponse.json({ error: "Tài khoản không có quyền nộp hồ sơ" }, { status: 403 });
    }
    const parsed = applicationSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
    }
    const payload = parsed.data;
    const studentId = payload.applicationType === "individual"
        ? studentIdFromDntuEmail(profile.email)
        : null;
    if (payload.applicationType === "individual" && !studentId) {
        return NextResponse.json({
            error: "Email tài khoản sinh viên phải có dạng MSSV@dntu.edu.vn.",
        }, { status: 403 });
    }
    const { data: period } = await supabase
        .from("evaluation_periods")
        .select("id,status,starts_at,ends_at,allow_individual,allow_branch_collective,allow_club_collective")
        .eq("id", payload.evaluationPeriodId)
        .single();
    const now = Date.now();
    if (!period || period.status !== "open" || now < new Date(period.starts_at).getTime() || now > new Date(period.ends_at).getTime()) {
        return NextResponse.json({ error: "Đợt xét hiện không nhận hồ sơ" }, { status: 400 });
    }
    let branchCode: string | null = null;
    let clubId: string | null = null;
    let collectiveType: "branch" | "club" | null = null;
    if (payload.applicationType === "individual") {
        if (profile.submission_scope !== "individual"
            || !profile.branch_code
            || payload.branchCode !== profile.branch_code
            || !period.allow_individual) {
            return NextResponse.json({ error: "Tài khoản không được nộp hồ sơ cá nhân trong đợt này" }, { status: 403 });
        }
        branchCode = profile.branch_code;
    }
    else if (payload.collectiveType === "branch") {
        if (profile.submission_scope !== "branch"
            || !profile.branch_code
            || payload.branchCode !== profile.branch_code
            || !period.allow_branch_collective) {
            return NextResponse.json({ error: "Tài khoản không được nộp hồ sơ tập thể cho Chi đoàn này" }, { status: 403 });
        }
        branchCode = profile.branch_code;
        collectiveType = "branch";
    }
    else {
        if (profile.submission_scope !== "club"
            || !profile.club_id
            || payload.clubId !== profile.club_id
            || !period.allow_club_collective) {
            return NextResponse.json({ error: "Tài khoản không được nộp hồ sơ tập thể cho CLB này" }, { status: 403 });
        }
        const { data: club } = await supabase
            .from("clubs")
            .select("id")
            .eq("id", profile.club_id)
            .eq("is_active", true)
            .single();
        if (!club)
            return NextResponse.json({ error: "CLB đã ngừng sử dụng" }, { status: 400 });
        clubId = profile.club_id;
        collectiveType = "club";
    }
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
    let existingQuery = supabase
        .from("applications")
        .select("id,code,status")
        .eq("evaluation_period_id", payload.evaluationPeriodId);
    if (payload.applicationType === "individual") {
        existingQuery = existingQuery.eq("application_type", "individual").eq("created_by", user.id);
    }
    else if (collectiveType === "branch") {
        existingQuery = existingQuery
            .eq("application_type", "collective")
            .eq("collective_type", "branch")
            .eq("branch_code", branchCode);
    }
    else {
        existingQuery = existingQuery
            .eq("application_type", "collective")
            .eq("collective_type", "club")
            .eq("club_id", clubId);
    }
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
        application_type: payload.applicationType,
        collective_type: collectiveType,
        branch_code: branchCode,
        club_id: clubId,
        subject_name: payload.subjectName,
        student_id: studentId,
        birth_date: payload.birthDate || null,
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
    await writeAudit(supabase, user.id, "application.create", "application", application.id, {
        code,
        evaluationPeriodId: payload.evaluationPeriodId,
        applicationType: payload.applicationType,
        collectiveType,
    });
    return NextResponse.json({ application, activityMap, awardMap }, { status: 201 });
}

