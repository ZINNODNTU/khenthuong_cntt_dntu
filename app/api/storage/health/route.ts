import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { checkStorageHealth, StorageGatewayError } from "@/lib/apps-script-storage";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET() {
    await requireRole(["admin"]);
    try {
        const health = await checkStorageHealth();
        return NextResponse.json({
            ok: true,
            message: "Kho ảnh đang hoạt động bình thường.",
            folderName: health.rootFolderName,
            version: health.version,
        });
    }
    catch (error) {
        console.error("[storage.health]", error);
        if (error instanceof StorageGatewayError) {
            return NextResponse.json({ ok: false, message: error.message, code: error.code }, { status: 502 });
        }
        return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Không thể kiểm tra kho ảnh." }, { status: 500 });
    }
}

