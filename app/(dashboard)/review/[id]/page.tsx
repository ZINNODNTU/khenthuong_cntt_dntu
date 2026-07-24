import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getApplication } from "@/lib/application-query";
import { ApplicationDetail } from "@/components/application-detail";
import { ReviewPanel } from "@/components/review-panel";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole(["admin", "reviewer"]);
  const app = await getApplication(supabase, id);
  if (!app) notFound();

  return (
    <div className="review-layout">
      <div className="review-main">
        <ApplicationDetail app={app} canReview={false} />
      </div>
      <ReviewPanel applicationId={app.id} initialComment={app.review_comment || ""} />
    </div>
  );
}
