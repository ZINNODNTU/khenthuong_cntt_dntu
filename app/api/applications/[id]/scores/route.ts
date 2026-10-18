import { NextResponse } from "next/server";

// Historic scoring data is retained for audit only. All new decisions are binary.
export async function POST() {
  return NextResponse.json(
    { error: "Hệ thống không còn chấm điểm; mỗi tiêu chí chỉ Đạt hoặc Không đạt." },
    { status: 410 },
  );
}
