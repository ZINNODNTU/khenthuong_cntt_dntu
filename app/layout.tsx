import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: {
        default: "Xét duyệt thành tích Khoa CNTT",
        template: "%s | Xét duyệt thành tích Khoa CNTT",
    },
    description: "Hệ thống quản lý hồ sơ và xét duyệt thành tích Khoa Công nghệ thông tin",
    icons: {
        icon: "/brand/doan-logo-512.png",
        apple: "/brand/doan-logo-512.png",
    },
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="vi">
      <body>{children}</body>
    </html>);
}

