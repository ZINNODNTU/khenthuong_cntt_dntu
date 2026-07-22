"use client";
import { useEffect } from "react";
import { SystemErrorView } from "@/components/system-error-view";
export default function DashboardError({ error, reset, }: {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Dashboard error", error);
    }, [error]);
    return (<SystemErrorView code="500" title="Không thể tải nội dung chức năng" message="Dữ liệu của trang hiện tại chưa thể tải hoặc xử lý." detail={error.digest ? `Mã kiểm tra: ${error.digest}` : "Hãy thử lại thao tác."} onRetry={reset}/>);
}

