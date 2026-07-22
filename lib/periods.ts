import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvaluationPeriod } from "@/lib/types";
export async function getEvaluationPeriods(supabase: SupabaseClient, options: {
    onlyOpen?: boolean;
} = {}): Promise<EvaluationPeriod[]> {
    let query = supabase.from("evaluation_periods").select("*").order("starts_at", { ascending: false });
    if (options.onlyOpen)
        query = query.eq("status", "open").lte("starts_at", new Date().toISOString()).gte("ends_at", new Date().toISOString());
    const { data, error } = await query;
    if (error)
        throw new Error(error.message);
    return (data || []) as EvaluationPeriod[];
}

