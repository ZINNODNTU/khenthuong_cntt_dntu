import { SystemErrorView } from "@/components/system-error-view";
export default async function ServerErrorPage({ searchParams, }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const code = typeof params.code === "string" ? params.code : "INTERNAL_SERVER_ERROR";
    return (<SystemErrorView code="500" title="Hệ thống chưa thể xử lý yêu cầu" message="Đã xảy ra lỗi trong quá trình tải dữ liệu hoặc kiểm tra tài khoản." detail={`Mã kiểm tra: ${code}. Vui lòng thử lại; nếu lỗi lặp lại, gửi mã này cho quản trị viên.`} showSignOut/>);
}

