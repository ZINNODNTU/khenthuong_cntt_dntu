import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity, Application, Evidence, PriorAward } from "@/lib/types";
export async function getApplication(supabase: SupabaseClient, id: string) {
    const { data: application, error } = await supabase.from("applications").select("*").eq("id", id).single();
    if (error || !application)
        return null;
    const [activitiesResult, awardsResult, evidencesResult, periodResult, clubResult] = await Promise.all([supabase.from("activities").select("*").eq("application_id", id).order("created_at"), supabase.from("prior_awards").select("*").eq("application_id", id).order("created_at"), supabase.from("evidences").select("*").eq("application_id", id).order("created_at"), supabase.from("evaluation_periods").select("name").eq("id", application.evaluation_period_id).maybeSingle(), application.club_id ? supabase.from("clubs").select("name").eq("id", application.club_id).maybeSingle() : Promise.resolve({ data: null, error: null })]);
    const evidences = (evidencesResult.data || []) as Evidence[];
    const activities = ((activitiesResult.data || []) as Activity[]).map(item => ({ ...item, evidences: evidences.filter(e => e.parent_type === "activity" && e.parent_id === item.id) }));
    const priorAwards = ((awardsResult.data || []) as PriorAward[]).map(item => ({ ...item, evidences: evidences.filter(e => e.parent_type === "award" && e.parent_id === item.id) }));
    return { ...(application as Application), period_name: periodResult.data?.name || "—", club_name: clubResult.data?.name || null, activities, prior_awards: priorAwards, evidences } as Application;
}

