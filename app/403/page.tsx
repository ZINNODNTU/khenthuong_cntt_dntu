import { SystemErrorView } from "@/components/system-error-view";
const messages: Record<string, {
    title: string;
    message: string;
    detail: string;
}> = {
    role: {
        title: "Bạn không có quyền truy cập",
        message: "Chức năng này không thuộc phạm vi tài khoản hiện tại.",
        detail: "Hãy trở về trang chính để hệ thống chuyển đến đúng cổng theo vai trò.",
    },
    inactive: {
        title: "Tài khoản đang bị khóa hoặc chưa kích hoạt",
        message: "Phiên đăng nhập hợp lệ nhưng tài khoản chưa được phép sử dụng hệ thống.",
        detail: "Liên hệ quản trị viên để kích hoạt tài khoản hoặc điều chỉnh đơn vị được phân công.",
    },
    "student-email": {
        title: "Email sinh viên chưa đúng định dạng",
        message: "Tài khoản nộp hồ sơ cá nhân phải sử dụng email MSSV@dntu.edu.vn.",
        detail: "MSSV được lấy từ phần số trước dấu @. Hãy liên hệ quản trị viên để điều chỉnh tài khoản.",
    },
};
export default async function ForbiddenPage({ searchParams, }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const reason = typeof params.reason === "string" ? params.reason : "role";
    const content = messages[reason] || messages.role;
    return (<SystemErrorView code="403" title={content.title} message={content.message} detail={content.detail} showSignOut={reason === "inactive" || reason === "student-email"}/>);
}

