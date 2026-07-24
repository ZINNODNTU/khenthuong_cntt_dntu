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

// Inline script to set theme before React hydrates — prevents flash
function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem("cntt-theme");if(!t){t=window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
