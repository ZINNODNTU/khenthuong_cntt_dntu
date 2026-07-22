import { SystemErrorView } from "@/components/system-error-view";
const messages: Record<string, {
    title: string;
    message: string;
    detail: string;
}> = {
    session: {
        title: "Bạn chưa đăng nhập",
        message: "Phiên làm việc không tồn tại hoặc đã hết hạn.",
        detail: "Hãy đăng nhập lại để tiếp tục sử dụng hệ thống.",
    },
    "profile-missing": {
        title: "Tài khoản chưa có hồ sơ sử dụng",
        message: "Tài khoản đăng nhập đã tồn tại nhưng chưa được cấp hồ sơ phân quyền.",
        detail: "Đăng xuất phiên hiện tại, sau đó liên hệ quản trị viên để kiểm tra tài khoản.",
    },
};
export default async function UnauthorizedPage({ searchParams, }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const reason = typeof params.reason === "string" ? params.reason : "session";
    const next = typeof params.next === "string" && params.next.startsWith("/")
        ? params.next
        : "/";
    const content = messages[reason] || messages.session;
    const loginHref = `/login?next=${encodeURIComponent(next)}`;
    return (<SystemErrorView code="401" title={content.title} message={content.message} detail={content.detail} loginHref={loginHref} showSignOut={reason === "profile-missing"}/>);
}

