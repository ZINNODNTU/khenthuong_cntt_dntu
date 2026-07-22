import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";
export function roleHome(role: UserRole): string {
    if (role === "admin")
        return "/dashboard";
    if (role === "reviewer")
        return "/review";
    return "/applications/new";
}
export async function requireUser() {
    const supabase = await createClient();
    const { data: { user }, error: userError, } = await supabase.auth.getUser();
    if (userError || !user) {
        redirect("/401?reason=session");
    }
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,full_name,role,submission_scope,branch_code,club_id,is_active,must_change_password")
        .eq("id", user.id)
        .maybeSingle();
    if (profileError) {
        redirect("/500?code=PROFILE_LOOKUP_FAILED");
    }
    if (!profile) {
        redirect("/401?reason=profile-missing");
    }
    if (!profile.is_active) {
        redirect("/403?reason=inactive");
    }
    if (profile.must_change_password) {
        redirect("/change-password");
    }
    return { user, profile: profile as Profile, supabase };
}
export async function requireRole(roles: UserRole[]) {
    const context = await requireUser();
    if (!roles.includes(context.profile.role)) {
        redirect("/403?reason=role");
    }
    return context;
}

