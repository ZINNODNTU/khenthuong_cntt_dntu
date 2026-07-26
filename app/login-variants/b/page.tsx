import { LoginVariantB } from "@/components/login-variant-b";
import { env } from "@/lib/env";

export default function Page() {
  return <LoginVariantB signupEnabled={env.publicSignupEnabled()} />;
}
