import { LoginScreen } from "@/components/login-screen";
import { env } from "@/lib/env";

export default function LoginPage() {
  return (
    <LoginScreen
      signupEnabled={env.publicSignupEnabled()}
    />
  );
}
