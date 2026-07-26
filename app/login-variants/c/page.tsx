import { LoginVariantC } from "@/components/login-variant-c";
import { env } from "@/lib/env";

export default function Page() {
  return <LoginVariantC signupEnabled={env.publicSignupEnabled()} />;
}
