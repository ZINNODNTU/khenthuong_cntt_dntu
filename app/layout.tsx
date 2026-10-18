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
    default: "Xét khen thưởng Đoàn – Hội Khoa Công nghệ thông tin",
    template: "%s | Xét khen thưởng Đoàn – Hội Khoa Công nghệ thông tin",
  },
  description:
    "Website xét khen thưởng cá nhân Đoàn – Hội Khoa Công nghệ thông tin, Trường Đại học Công nghệ Đồng Nai",
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
        __html: `(function(){var t="light";try{var saved=localStorage.getItem("cntt-theme");if(saved==="dark"||saved==="light")t=saved}catch(e){}document.documentElement.setAttribute("data-theme",t)})()`,
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
