import type { SupabaseClient } from "@supabase/supabase-js";
import type { Club } from "@/lib/types";
export async function getClubs(supabase: SupabaseClient, options: {
    includeInactive?: boolean;
} = {}): Promise<Club[]> {
    let query = supabase.from("clubs").select("*").order("name");
    if (!options.includeInactive)
        query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error)
        throw new Error(error.message);
    return (data || []) as Club[];
}

