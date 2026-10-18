import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity, Application, Evidence, EvidenceEntry, PriorAward } from "@/lib/types";

export async function getApplication(supabase: SupabaseClient, id: string) {
  const { data: application, error } = await supabase.from("applications").select("*").eq("id", id).single();
  if (error || !application) return null;

  // Do not fetch legacy public bearer tokens or Drive IDs to the UI.
  const [activitiesResult, awardsResult, evidencesResult, periodResult, clubResult, criteriaResult, entriesResult] = await Promise.all([
    supabase.from("activities").select("*").eq("application_id", id).order("created_at"),
    supabase.from("prior_awards").select("*").eq("application_id", id).order("created_at"),
    supabase.from("evidences")
      .select("id,file_name,mime_type,size_bytes,category,parent_type,parent_id,evidence_entry_id,created_at")
      .eq("application_id", id).order("created_at"),
    supabase.from("evaluation_periods").select("name").eq("id", application.evaluation_period_id).maybeSingle(),
    application.club_id
      ? supabase.from("clubs").select("name").eq("id", application.club_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("application_criteria").select("*").eq("application_id", id).order("code"),
    supabase.from("evidence_entries").select("id,application_id,criterion_code,title,description,created_at")
      .eq("application_id", id).order("created_at"),
  ]);
  const evidences = (evidencesResult.data || []) as Evidence[];
  const byParent = new Map<string, Evidence[]>();
  for (const evidence of evidences) {
    const key = `${evidence.parent_type}:${evidence.parent_id}`;
    const group = byParent.get(key);
    if (group) group.push(evidence);
    else byParent.set(key, [evidence]);
  }
  const activities = ((activitiesResult.data || []) as Activity[])
    .map(item => ({ ...item, evidences: byParent.get(`activity:${item.id}`) || [] }));
  const priorAwards = ((awardsResult.data || []) as PriorAward[])
    .map(item => ({ ...item, evidences: byParent.get(`award:${item.id}`) || [] }));
  return {
    ...(application as Application),
    period_name: periodResult.data?.name || "—",
    club_name: clubResult.data?.name || null,
    activities,
    prior_awards: priorAwards,
    evidences,
    evidence_entries: (entriesResult.data || []) as EvidenceEntry[],
    criteria: (criteriaResult.data || []) as Application["criteria"],
  } as Application;
}