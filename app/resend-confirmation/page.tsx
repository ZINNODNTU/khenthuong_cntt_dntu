"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/browser";
import { loginEmailFromInput } from "@/lib/identity";
import styles from "@/components/password-recovery.module.css";

export default function ResendConfirmationPage() {
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || accepted) return;
    const email = loginEmailFromInput(String(new FormData(event.currentTarget).get("email") || ""));
    if (!/^\d{5,20}@dntu\.edu\.vn$/.test(email)) {
      setError("Vui lòng nhập MSSV hoặc email sinh viên dạng MSSV@dntu.edu.vn.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const client = createClient();
      const { error: resultError } = await client.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/finish` },
      });
      if (resultError) {
        const limited = resultError.status === 429 || /rate limit|too many|over_email_send_rate_limit/i.test(resultError.message);
        setError(limited
          ? "Hệ thống đang giới hạn số lần gửi thư. Vui lòng thử lại sau ít phút."
          : "Chưa tiếp nhận được yêu cầu gửi lại thư. Vui lòng thử lại sau hoặc liên hệ quản trị.");
        return;
      }
      // Accepted by Supabase does not prove that mail was delivered.
      setAccepted(true);
    } catch {
      setError("Không kết nối được dịch vụ email. Vui lòng thử lại sau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="resend-title">
        <div className={styles.brand}><BrandLogo size={47} priority /><span>KHOA CÔNG NGHỆ THÔNG TIN<br />DNTU · ĐOÀN – HỘI</span></div>
        <div className={styles.eyebrow}>XÁC THỰC TÀI KHOẢN</div>
        <h1 className={styles.title} id="resend-title">Gửi lại email xác nhận</h1>
        <p className={styles.description}>Nếu bạn đã đăng ký nhưng chưa xác nhận email hoặc liên kết cũ đã hết hạn, hãy nhập MSSV hay email trường để yêu cầu thư mới.</p>
        {accepted ? (
          <div className={styles.message} role="status">
            <strong>Đã tiếp nhận yêu cầu.</strong> Nếu tài khoản cần xác nhận và email hợp lệ, hệ thống sẽ gửi thư mới.
            Hãy kiểm tra Hộp thư đến, Spam và Tất cả thư. Không gửi yêu cầu liên tục để tránh giới hạn tần suất.
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            {error && <div className={styles.error} role="alert">{error}</div>}
            <div className={styles.field}>
              <label htmlFor="resend-email">MSSV hoặc email sinh viên DNTU</label>
              <input id="resend-email" name="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="12345678 hoặc 12345678@dntu.edu.vn" disabled={busy} />
              <span className={styles.hint}>Thư chỉ có thể đến địa chỉ email đã đăng ký và đang sử dụng.</span>
            </div>
            <button type="submit" className={styles.button} disabled={busy}>
              <MailCheck size={18} />{busy ? "Đang gửi yêu cầu..." : "Gửi lại thư xác nhận"}<ArrowRight size={17} />
            </button>
          </form>
        )}
        <Link href="/login" className={styles.back}><ArrowLeft size={17} /> Quay về đăng nhập</Link>
      </section>
    </main>
  );
}
