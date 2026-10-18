import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { escapeCsvCell } from "@/lib/report-csv";

export const dynamic = "force-dynamic";

type ResultRecord = {
  id: string; code: string; subject_name: string; student_id: string | null;
  evaluation_period_id: string; application_type: string; collective_type: string | null;
  branch_code: string | null; status: string; review_comment: string | null;
  decided_at: string | null; reviewer_id: string | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles")
    .select("role,is_active,must_change_password").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || profile.must_change_password || profile.role !== "admin") {
    return NextResponse.json({ error: "Chỉ quản trị viên được xuất báo cáo tổng hợp." }, { status: 403 });
  }

  const period = new URL(request.url).searchParams.get("period") || "";
  if (period && !z.uuid().safeParse(period).success) {
    return NextResponse.json({ error: "Đợt xét không hợp lệ." }, { status: 400 });
  }
  const records: ResultRecord[] = [];
  const pageSize = 500;
  const maxRows = 5000;
  for (let offset = 0; offset <= maxRows; offset += pageSize) {
    let query = supabase.from("applications")
      .select("id,code,subject_name,student_id,evaluation_period_id,application_type,collective_type,branch_code,status,review_comment,decided_at,reviewer_id")
      .in("status", ["passed", "failed", "revision"])
      .eq("application_type", "individual")
      .order("decided_at", { ascending: false }).order("code")
      .range(offset, offset + pageSize - 1);
    if (period) query = query.eq("evaluation_period_id", period);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Không thể tổng hợp dữ liệu." }, { status: 500 });
    if (!data?.length) break;
    records.push(...data as ResultRecord[]);
    if (records.length > maxRows) return NextResponse.json({
      error: "Báo cáo vượt quá 5.000 hồ sơ. Hãy lọc theo đợt xét.",
    }, { status: 422 });
    if (data.length < pageSize) break;
  }

  const [{ data: periods }, { data: reviewers }] = await Promise.all([
    supabase.from("evaluation_periods").select("id,name"),
    supabase.from("profiles").select("id,full_name").in("role", ["admin", "reviewer"]),
  ]);
  const periodNames = new Map((periods || []).map(row => [row.id, row.name]));
  const reviewerNames = new Map((reviewers || []).map(row => [row.id, row.full_name]));
  const statusNames: Record<string, string> = {
    passed: "Đạt", failed: "Không đạt", revision: "Yêu cầu bổ sung",
  };
  const headings = [
    "Mã hồ sơ", "Đợt xét", "Đối tượng", "MSSV", "Loại hồ sơ",
    "Chi đoàn", "Kết luận", "Nhận xét hội đồng", "Cán bộ kết luận", "Thời gian kết luận",
  ];
  const lines = [headings.map(escapeCsvCell).join(",")];
  for (const row of records) {
    const kind = row.application_type === "individual" ? "Cá nhân"
      : row.collective_type === "club" ? "Tập thể câu lạc bộ" : "Tập thể chi đoàn";
    lines.push([
      row.code, periodNames.get(row.evaluation_period_id) || "Không rõ", row.subject_name,
      row.student_id || "", kind, row.branch_code || "", statusNames[row.status] || row.status,
      row.review_comment || "", reviewerNames.get(row.reviewer_id || "") || "",
      row.decided_at ? new Date(row.decided_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "",
    ].map(escapeCsvCell).join(","));
  }
  const filename = `ket-qua-xet-khen-thuong-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response("\uFEFF" + lines.join("\r\n"), {
    status: 200, headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
