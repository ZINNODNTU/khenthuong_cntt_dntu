import { NextResponse } from "next/server";

// Numeric rubrics were retired. Existing rows remain available for historical audit.
export async function POST() {
  return NextResponse.json(
    { error: "Không sử dụng biểu điểm. Hội đồng chỉ xét minh chứng Đạt hoặc Không đạt." },
    { status: 410 },
  );
}
