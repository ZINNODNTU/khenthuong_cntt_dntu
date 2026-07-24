import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Xét duyệt thành tích Khoa CNTT",
    template: "%s | Xét duyệt thành tích Khoa CNTT",
  },
  description:
    "Hệ thống quản lý hồ sơ và xét duyệt thành tích Khoa Công nghệ thông tin",
  icons: {
    icon: "/brand/doan-logo-512.png",
    apple: "/brand/doan-logo-512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
