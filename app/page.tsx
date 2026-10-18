export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { roleHome } from "@/lib/auth";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { studentProfileComplete } from "@/lib/student-onboarding";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => typeof value === "string" ? value : undefined;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const query = (await searchParams) || {};
    return (
      <LoginScreen
        signupEnabled={env.publicSignupEnabled()}
        loginQuery={{
          error: first(query.error),
          confirmed: first(query.confirmed),
          next: first(query.next),
        }}
      />
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,role,submission_scope,branch_code,club_id,is_active,must_change_password,phone,birth_date,profile_completed_at",
    )
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

  if (profile.role === "submitter" && profile.submission_scope === "individual") {
    if (!user.email_confirmed_at) redirect("/login?error=session");
    if (!studentProfileComplete(profile)) redirect("/complete-profile");
  }
  redirect(roleHome((profile as Profile).role));
}

