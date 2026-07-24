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
    const { data: { user }, } = await client.auth.getUser();
    if (!user && isApi && !isAuthApi) {
        return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!user && !isPublicPage(path) && !isAuthApi) {
        return NextResponse.redirect(loginPath(request));
    }
    // Khong redirect /login hoac /register ve / tai proxy.
    // Trang goc va guard phan quyen se quyet dinh dich den, tranh vong lap 307
    // khi Auth user ton tai nhung profile bi thieu hoac bi khoa.
    return response;
}

