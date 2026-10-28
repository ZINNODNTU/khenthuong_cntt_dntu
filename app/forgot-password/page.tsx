"use client";

import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { requestAuthEmail } from "@/lib/auth-email-client";
import { loginEmailFromInput } from "@/lib/identity";
import styles from "@/components/password-recovery.module.css";

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pendingSeconds, setPendingSeconds] = useState(0);

  useEffect(() => {
    if (!busy) { return; }
    const started = Date.now();
    const timer = window.setInterval(() => setPendingSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const email = loginEmailFromInput(String(new FormData(event.currentTarget).get("email") || ""));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      setError("Vui lòng nhập MSSV hoặc địa chỉ email hợp lệ.");
      return;
    }
    setPendingSeconds(0);
    setBusy(true);
    setError("");
    try {
      const result = await requestAuthEmail("recovery", email);
      if (!result.ok) {
        setError(result.message);
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
            <button className={styles.button} disabled={busy} type="submit"><Mail size={18} /> {busy ? "Đang yêu cầu gửi thư..." : "Gửi liên kết khôi phục"} <ArrowRight size={17} /></button>
            {busy && <p className={styles.hint} role="status" aria-live="polite">{pendingSeconds >= 12
              ? "Dịch vụ email đang phản hồi chậm. Không đóng trang hoặc gửi yêu cầu khác; thư có thể đến trước khi hệ thống xác nhận."
              : pendingSeconds >= 4
                ? "Đang kết nối máy chủ gửi email. Vui lòng không bấm gửi nhiều lần."
                : "Đã chuyển yêu cầu tới website. Đang chờ Supabase xác nhận..."}</p>}
          </form>
        )}
        <Link href="/login" className={styles.back}><ArrowLeft size={17} /> Quay về đăng nhập</Link>
        <div><Link href="/resend-confirmation" className={styles.back}>Chưa xác nhận email? Gửi lại thư kích hoạt</Link></div>
      </section>
    </main>
  );
}
