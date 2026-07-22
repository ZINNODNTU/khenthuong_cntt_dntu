import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { downloadEvidence } from "@/lib/apps-script-storage";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(_: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return new NextResponse("Unauthorized", { status: 401 });
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_active,must_change_password")
        .eq("id", user.id)
        .maybeSingle();
    if (!profile?.is_active)
        return new NextResponse("Forbidden", { status: 403 });
    if (profile.must_change_password)
        return new NextResponse("Password change required", { status: 403 });
    const { data: evidence } = await supabase
        .from("evidences")
        .select("drive_file_id,mime_type,file_name")
        .eq("id", id)
        .single();
    if (!evidence)
        return new NextResponse("Not found", { status: 404 });
    try {
        const downloaded = await downloadEvidence(evidence.drive_file_id);
        const buffer = Buffer.from(downloaded.base64, "base64");
        return new NextResponse(buffer, {
            headers: {
                "content-type": evidence.mime_type || downloaded.mimeType,
                "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(evidence.file_name || downloaded.fileName)}`,
                "cache-control": "private, max-age=300"
            }
        });
    }
    catch (error) {
        return new NextResponse(error instanceof Error ? error.message : "Không thể tải ảnh", { status: 502 });
    }
}

