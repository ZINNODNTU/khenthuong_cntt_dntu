import { LoginScreen } from "@/components/login-screen";
import { env } from "@/lib/env";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => typeof value === "string" ? value : undefined;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
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
