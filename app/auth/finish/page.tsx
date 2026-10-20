"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, MailCheck, AlertTriangle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./finish.module.css";

export default function EmailVerificationFinish() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(false);

  useEffect(() => {
    // Default Supabase Auth email links may land with PKCE code or tokens.
    // Let the browser client consume that URL before removing credentials.
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const hasError = fragment.has("error") || query.has("error") ||
      fragment.has("error_code") || query.has("error_code");
    const recovering = query.get("mode") === "recovery" || fragment.get("type") === "recovery";

    if (recovering && !hasError) {
      let cancelled = false;
      setCheckingRecovery(true);
      void (async () => {
        try {
          const client = createClient();
          // Compatibility with recovery emails issued before the HTML template
          // was switched to the server-side token_hash verification route.
          const code = query.get("code");
          if (code) await client.auth.exchangeCodeForSession(code);
          const access_token = fragment.get("access_token");
          const refresh_token = fragment.get("refresh_token");
          if (access_token && refresh_token) {
            await client.auth.setSession({ access_token, refresh_token });
          }
          const { data: { user }, error } = await client.auth.getUser();
          if (!cancelled && !error && user) {
            // The verified user session is stored in Supabase SSR cookies.
            // ResetPasswordPage checks the user again on the server.
            router.replace("/reset-password");
            return;
          }
        } catch {
          // Expired, invalid or already-consumed recovery link.
        }
        if (!cancelled) {
          window.history.replaceState(null, "", "/auth/finish");
          setCheckingRecovery(false);
          setFailed(true);
        }
      })();
      return () => { cancelled = true; };
    }

    setFailed(hasError);
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, "", "/auth/finish");
    }
  }, [router]);
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}><BrandLogo size={50} priority /><div><strong>KHOA CNTT · DNTU</strong><span>Cổng xét khen thưởng sinh viên</span></div></div>
        <div className={styles.icon}>
          {failed ? <AlertTriangle size={35} /> : <MailCheck size={37} />}
        </div>
        <h1>{checkingRecovery ? "Đang xác minh liên kết" : failed ? "Liên kết không hợp lệ hoặc đã hết hạn" : "Đã mở liên kết xác nhận"}</h1>
        <p>
          {failed
            ? "Liên kết có thể đã hết hạn hoặc đã được sử dụng. Hãy yêu cầu email mới hoặc liên hệ quản trị để được hỗ trợ."
            : checkingRecovery
              ? "Hệ thống đang kiểm tra phiên khôi phục mật khẩu và chuyển đến trang đặt mật khẩu mới."
              : "Supabase đã xử lý liên kết từ email trường. Hãy đăng nhập để kiểm tra tài khoản và hoàn thiện hồ sơ."}
        </p>
        {!failed && !checkingRecovery && <div className={styles.hint}><CheckCircle2 size={18} /> Hệ thống sẽ chỉ cho vào khu vực xét thưởng khi email được xác minh và thông tin sinh viên đầy đủ.</div>}
        {!checkingRecovery && <Link className={styles.action} href={failed ? "/forgot-password" : "/login"}>{failed ? "Yêu cầu liên kết mới" : "Đến trang đăng nhập"} <ArrowRight size={19} /></Link>}
      </section>
    </main>
  );
}
