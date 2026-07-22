import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }

  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const tokenHash =
    url.searchParams.get("token_hash");

  const type =
    url.searchParams.get("type") as EmailOtpType | null;

  const next = safeNext(
    url.searchParams.get("next"),
  );

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/?error=callback", url.origin),
    );
  }

  const client = await createClient();

  const { error } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/?error=callback", url.origin),
    );
  }

  return NextResponse.redirect(
    new URL(next, url.origin),
  );
}
