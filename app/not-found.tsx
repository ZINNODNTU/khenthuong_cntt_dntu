import { SystemErrorView } from "@/components/system-error-view";
export default function NotFound() {
    return (<SystemErrorView code="404" title="Không tìm thấy trang" message="Đường dẫn bạn mở không tồn tại, đã được đổi tên hoặc bạn nhập chưa chính xác." detail="Hãy trở về trang chính để tiếp tục sử dụng hệ thống."/>);
}

