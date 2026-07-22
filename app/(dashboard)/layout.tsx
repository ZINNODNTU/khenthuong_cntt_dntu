export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
export default async function DashboardLayout({ children }: {
    children: React.ReactNode;
}) {
    const { profile, supabase } = await requireUser();
    let activeBranchCount = 0;
    if (profile.role === "admin") {
        const { count } = await supabase
            .from("branches")
            .select("code", { count: "exact", head: true })
            .eq("is_active", true);
        activeBranchCount = count || 0;
    }
    return <AppShell profile={profile} activeBranchCount={activeBranchCount}>{children}</AppShell>;
}

