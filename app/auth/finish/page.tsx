"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, MailCheck, AlertTriangle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./finish.module.css";

export default function EmailVerificationFinish() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    // Supabase's default verification email redirects with temporary auth
    // information in the URL fragment. Do not persist or display these tokens.
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const hasError = fragment.has("error") || query.has("error") ||
      fragment.has("error_code") || query.has("error_code");
    setFailed(hasError);
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, "", "/auth/finish");
    }
  }, []);
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}><BrandLogo size={50} priority /><div><strong>KHOA CNTT · DNTU</strong><span>Cổng xét khen thưởng sinh viên</span></div></div>
        <div className={styles.icon}>
          {failed ? <AlertTriangle size={35} /> : <MailCheck size={37} />}
        </div>
        <h1>{failed ? "Liên kết chưa được xác nhận" : "Đã mở liên kết xác nhận"}</h1>
        <p>
          {failed
            ? "Liên kết có thể đã hết hạn hoặc không hợp lệ. Hãy kiểm tra email mới nhất hoặc liên hệ quản trị để được hỗ trợ."
            : "Supabase đã xử lý liên kết từ email trường. Hãy đăng nhập để xác minh tài khoản đã được kích hoạt và tiếp tục hoàn thiện hồ sơ."}
        </p>
        {!failed && <div className={styles.hint}><CheckCircle2 size={18} /> Hệ thống sẽ chỉ cho vào khu vực xét thưởng khi email được xác minh và thông tin sinh viên đầy đủ.</div>}
        <Link className={styles.action} href="/login">Đến trang đăng nhập <ArrowRight size={19} /></Link>
      </section>
    </main>
  );
}
