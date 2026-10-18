import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getApplication } from "@/lib/application-query";
import { ApplicationDetail } from "@/components/application-detail";
import { ReviewWorkspace } from "@/components/review-workspace";
import { ReviewHistory } from "@/components/review-history";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole(["admin", "reviewer"]);
  const app = await getApplication(supabase, id);
  if (!app) notFound();

  const [decisionsResult, changesResult] = await Promise.all([
    supabase.from("review_history")
      .select("id,decision,comment,created_at")
      .eq("application_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("criterion_review_history")
      .select("id,code,previous_status,next_status,reviewer_note,changed_at")
      .eq("application_id", id).order("changed_at", { ascending: false }).limit(80),
  ]);

  return (
    <ReviewWorkspace
      evidences={app.evidences || []}
      entries={app.evidence_entries || []}
      review={{
        applicationId: app.id,
        applicationType: app.application_type,
        applicationStatus: app.status,
        reviewerId: app.reviewer_id,
        currentUserId: profile.id,
        currentUserRole: profile.role,
        initialComment: app.review_comment || "",
        criteria: app.criteria || [],
        evidences: app.evidences || [],
      }}
    >
      <ApplicationDetail app={app} canReview={false} />
      <ReviewHistory decisions={decisionsResult.data || []} changes={changesResult.data || []} />
    </ReviewWorkspace>
  );
}
