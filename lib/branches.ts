import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_BRANCHES } from "@/lib/constants";
export type Branch = {
    code: string;
    name: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
};
export async function getBranches(supabase: SupabaseClient, options?: {
    includeInactive?: boolean;
}) {
    let query = supabase.from("branches").select("code,name,is_active,created_at,updated_at").order("code");
    if (!options?.includeInactive)
        query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error)
        throw new Error(error.message);
    return (data || []) as Branch[];
}
export async function getActiveBranchCodes(supabase: SupabaseClient) {
    const branches = await getBranches(supabase);
    return branches.length ? branches.map((branch) => branch.code) : [...DEFAULT_BRANCHES];
}

