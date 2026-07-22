import { notFound, redirect } from "next/navigation";
import { SupplementForm } from "@/components/supplement-form";
import { requireRole } from "@/lib/auth";
import { getApplication } from "@/lib/application-query";
export default async function SupplementPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const { supabase, profile } = await requireRole(["submitter"]);
    const app = await getApplication(supabase, id);
    if (!app)
        notFound();
    if (app.created_by !== profile.id || !["draft", "revision"].includes(app.status))
        redirect(`/applications/${id}`);
    return <><div className="page-head"><div><div className="eyebrow">CẬP NHẬT HỒ SƠ</div><h1>Bổ sung hồ sơ</h1><p>{app.code} · {app.subject_name}</p></div></div><SupplementForm app={app}/></>;
}

