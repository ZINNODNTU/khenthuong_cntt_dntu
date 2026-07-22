export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { roleHome } from "@/lib/auth";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <LoginScreen
        signupEnabled={env.publicSignupEnabled()}
      />
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,role,submission_scope,branch_code,club_id,is_active,must_change_password",
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

  redirect(roleHome((profile as Profile).role));
}
