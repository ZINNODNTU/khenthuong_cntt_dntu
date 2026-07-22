"use client";
import { useEffect } from "react";
import { SystemErrorView } from "@/components/system-error-view";
export default function ErrorPage({ error, reset, }: {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Application error", error);
    }, [error]);
    return (<SystemErrorView code="500" title="Đã xảy ra lỗi ngoài dự kiến" message="Hệ thống không thể hoàn tất thao tác vừa thực hiện." detail={error.digest ? `Mã kiểm tra: ${error.digest}` : "Vui lòng thử lại sau vài giây."} onRetry={reset} showSignOut/>);
}

