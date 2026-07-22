import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
function safeNext(value: string | null): string {
    if (!value || !value.startsWith("/") || value.startsWith("//"))
        return "/";
    return value;
}
export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const next = safeNext(url.searchParams.get("next"));
    if (!code)
        return NextResponse.redirect(new URL("/login?error=callback", url.origin));
    const client = await createClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error)
        return NextResponse.redirect(new URL("/login?error=callback", url.origin));
    return NextResponse.redirect(new URL(next, url.origin));
}

