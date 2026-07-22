"use client";
import { SystemErrorView } from "@/components/system-error-view";
export default function GlobalError({ reset, }: {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
}) {
    return (<html lang="vi">
      <body>
        <SystemErrorView code="500" title="Giao diện hệ thống gặp sự cố" message="Không thể tải cấu trúc chính của ứng dụng." detail="Hãy thử tải lại; nếu lỗi tiếp tục, liên hệ quản trị viên kỹ thuật." onRetry={reset}/>
      </body>
    </html>);
}

