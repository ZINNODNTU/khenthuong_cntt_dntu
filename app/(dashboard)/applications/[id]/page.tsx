import { notFound } from "next/navigation";
import { ApplicationDetail } from "@/components/application-detail";
import { requireUser } from "@/lib/auth";
import { getApplication } from "@/lib/application-query";
export default async function ApplicationPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const { supabase, profile } = await requireUser();
    const app = await getApplication(supabase, id);
    if (!app)
        notFound();
    const canSupplement = profile.role === "submitter" && app.created_by === profile.id && ["draft", "revision"].includes(app.status);
    return <ApplicationDetail app={app} canReview={["admin", "reviewer"].includes(profile.role)} canSupplement={canSupplement}/>;
}

