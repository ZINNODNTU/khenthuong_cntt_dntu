import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { processDueStorageCleanup } from "@/lib/storage-cleanup";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Invoke from a trusted cron service: GET /api/cron/storage-cleanup, Authorization: Bearer CRON_SECRET. */
export async function GET(request: Request) {
  const configured = process.env.CRON_SECRET;
  const received = request.headers.get("authorization");
  const expected = configured ? `Bearer ${configured}` : "";
  const valid = Boolean(configured && configured.length >= 24 && received
    && Buffer.byteLength(received) === Buffer.byteLength(expected)
    && timingSafeEqual(Buffer.from(received), Buffer.from(expected)));
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, counts: await processDueStorageCleanup() }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("[storage.cleanup.job]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Cleanup failed" }, { status: 503 });
  }
}
