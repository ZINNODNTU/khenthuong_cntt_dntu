"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/browser";
import { loginEmailFromInput } from "@/lib/identity";
import styles from "@/components/password-recovery.module.css";

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const email = loginEmailFromInput(String(new FormData(event.currentTarget).get("email") || ""));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      setError("Vui lòng nhập MSSV hoặc địa chỉ email hợp lệ.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const client = createClient();
      const { error: resultError } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm`,
      });
      if (resultError) {
        // Never claim delivery when Supabase rejected the request, and never
        // reveal whether an account exists for the submitted address.
        const isRateLimited = resultError.status === 429 ||
          /rate limit|too many|over_email_send_rate_limit/i.test(resultError.message);
        setError(isRateLimited
          ? "Hệ thống đang giới hạn số lần gửi email. Vui lòng chờ vài phút rồi thử lại."
          : "Hệ thống chưa tiếp nhận được yêu cầu khôi phục. Dịch vụ email có thể đang gặp sự cố; vui lòng thử lại sau hoặc liên hệ quản trị.");
        return;
      }
      // HTTP success means the request was accepted, not that mail was
      // delivered or that the email belongs to an existing account.
      setSent(true);
    } catch {
      setError("Không kết nối được dịch vụ xác thực. Vui lòng thử lại sau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="recovery-title">
        <div className={styles.brand}><BrandLogo size={47} priority /><span>KHOA CÔNG NGHỆ THÔNG TIN<br />DNTU · ĐOÀN – HỘI</span></div>
        <div className={styles.eyebrow}>KHÔI PHỤC TÀI KHOẢN</div>
        <h1 className={styles.title} id="recovery-title">Quên mật khẩu?</h1>
        <p className={styles.description}>Nhập MSSV hoặc email đã đăng ký. Nếu tài khoản tồn tại, hệ thống sẽ gửi liên kết đặt lại mật khẩu vào hộp thư của bạn.</p>
        {sent ? (
          <div role="status" className={styles.message}>
            <strong>Đã tiếp nhận yêu cầu.</strong> Nếu địa chỉ email thuộc tài khoản đã đăng ký, hệ thống sẽ gửi liên kết đặt lại mật khẩu.
            Kiểm tra Hộp thư đến, Spam và mục Tất cả thư, tìm thư từ “Đoàn – Hội Khoa CNTT DNTU”.
            Nếu không nhận được sau vài phút, hãy kiểm tra lại email đăng ký hoặc liên hệ quản trị.
          </div>
        ) : (
          <form className={styles.form} onSubmit={requestReset}>
            {error && <div role="alert" className={styles.error}>{error}</div>}
            <div className={styles.field}>
              <label htmlFor="recovery-email">MSSV hoặc email đăng ký</label>
              <input id="recovery-email" name="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="1822040304 hoặc email@dntu.edu.vn" disabled={busy} />
              <span className={styles.hint}>Sử dụng đúng email có quyền truy cập để nhận liên kết bảo mật.</span>
            </div>
            <button className={styles.button} disabled={busy} type="submit"><Mail size={18} /> {busy ? "Đang xử lý..." : "Gửi liên kết khôi phục"} <ArrowRight size={17} /></button>
          </form>
        )}
        <Link href="/login" className={styles.back}><ArrowLeft size={17} /> Quay về đăng nhập</Link>
      </section>
    </main>
  );
}
