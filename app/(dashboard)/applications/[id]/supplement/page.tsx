import { notFound, redirect } from "next/navigation";
import { CriterionEvidenceForm } from "@/components/criterion-evidence-form";
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
    return <CriterionEvidenceForm app={app} />;
}

