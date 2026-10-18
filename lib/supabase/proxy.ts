import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
const PUBLIC_PAGE_PREFIXES = [
    "/login",
    "/register",
    "/configuration",
    "/design-preview",
    "/401",
    "/403",
    "/500",
    "/auth/",
    "/_next",
];
function isPublicPage(pathname: string) {
    return (
        pathname === "/" ||
        PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
        pathname === "/favicon.ico" ||
        pathname.startsWith("/brand/")
    );
}
function loginPath(request: NextRequest) {
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const url = new URL("/", request.url);
    url.searchParams.set("error", "session");
    url.searchParams.set("next", next);
    return url;
}
function withSessionCookies(target: NextResponse, source: NextResponse): NextResponse {
    // Supabase can rotate tokens during getUser(). Preserve refreshed cookies even
    // when the proxy returns a redirect or 401 instead of NextResponse.next().
    source.cookies.getAll().forEach(({ name, value, ...options }) => {
        target.cookies.set(name, value, options);
    });
    return target;
}
export async function updateSession(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const isApi = path.startsWith("/api/");
    const isAuthApi = path.startsWith("/api/auth/");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const configurationPath = path.startsWith("/configuration");
    if (!url || !key) {
        if (configurationPath || path.startsWith("/_next") || path.startsWith("/brand/")) {
            return NextResponse.next({ request });
        }
        if (isApi) {
            return NextResponse.json({
                error: "Hệ thống chưa hoàn tất cấu hình vận hành.",
                code: "SYSTEM_NOT_CONFIGURED",
            }, { status: 503 });
        }
        return NextResponse.redirect(new URL("/configuration", request.url));
    }
    // Public pages and auth callback endpoints do not need a network round trip
    // to Supabase just to render a login form. The root page checks its own user.
    if (isPublicPage(path) || isAuthApi) {
        return NextResponse.next({ request });
    }
    let response = NextResponse.next({ request });
    const client = createServerClient(url, key, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => {
                    response.cookies.set(name, value, options);
                });
            },
        },
    });
    const { data: claimsData, error: claimsError } = await client.auth.getClaims();
    const authenticated = Boolean(claimsData?.claims?.sub && !claimsError);
    if (!authenticated && isApi) {
        return withSessionCookies(NextResponse.json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", code: "UNAUTHORIZED" }, { status: 401 }), response);
    }
    if (!authenticated) {
        return withSessionCookies(NextResponse.redirect(loginPath(request)), response);
    }
    // Khong redirect /login hoac /register ve / tai proxy.
    // Trang goc va guard phan quyen se quyet dinh dich den, tranh vong lap 307
    // khi Auth user ton tai nhung profile bi thieu hoac bi khoa.
    return response;
}

