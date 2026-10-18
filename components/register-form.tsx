"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import styles from "@/app/(auth)/register/register-page.module.css";

export function RegisterForm({
  branches,
  senderAddress,
}: {
  branches: { code: string; name: string }[];
  senderAddress: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      fullName: String(form.get("fullName") || "").trim(),
      email: String(form.get("email") || "").trim().toLowerCase(),
      branchCode: String(form.get("branchCode") || ""),
      birthDate: String(form.get("birthDate") || ""),
      phone: String(form.get("phone") || "").trim(),
      password: String(form.get("password") || ""),
      confirmPassword: String(form.get("confirmPassword") || ""),
    };
    try {
      if (!/^\d{5,20}@dntu\.edu\.vn$/.test(payload.email)) {
        setMessage("Email bắt buộc có dạng MSSV@dntu.edu.vn (phần MSSV chỉ gồm chữ số).");
        return;
      }
      if (payload.password !== payload.confirmPassword) {
        setMessage("Mật khẩu và xác nhận mật khẩu không khớp.");
        return;
      }
      const response = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; requiresConfirmation?: boolean; email?: string };
      if (!response.ok) {
        setMessage(result.error || "Không thể đăng ký tài khoản. Vui lòng thử lại.");
        return;
      }
      setSuccess(true);
      setRegisteredEmail(result.email || payload.email);
    } catch {
      setMessage("Không thể kết nối máy chủ đăng ký. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setBusy(false);
    }
  }

  if (success) return (
    <div className={styles.successBox} role="status">
      <CheckCircle2 size={40} aria-hidden="true" />
      <h3>Kiểm tra email trường của bạn</h3>
      <p>Chúng tôi đã gửi liên kết xác nhận tới <strong>{registeredEmail}</strong>. Nhấn vào liên kết trong email để kích hoạt tài khoản trước khi đăng nhập.</p>
      <p>Không thấy thư? Hãy kiểm tra Spam hoặc mục Quảng cáo{senderAddress ? ` (thư gửi từ ${senderAddress})` : ""}.</p>
      <Link className={styles.backButton} href="/login">Quay về đăng nhập <ArrowRight size={17} /></Link>
    </div>
  );

  return (
    <div className={styles.formArea}>
      {message && <div className={styles.error} role="alert">{message}</div>}
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="register-name">Họ và tên <span>*</span></label>
          <input id="register-name" name="fullName" required minLength={2} maxLength={150} autoComplete="name" placeholder="Ví dụ: Nguyễn Văn An" disabled={busy} />
        </div>
        <div className={styles.field}>
          <label htmlFor="register-email">Email sinh viên DNTU <span>*</span></label>
          <input id="register-email" name="email" type="email" required pattern="[0-9]{5,20}@dntu\.edu\.vn" maxLength={40} autoCapitalize="none" spellCheck={false} autoComplete="email" placeholder="12345678@dntu.edu.vn" disabled={busy} />
          <small>Chỉ chấp nhận email trường. MSSV được xác định từ email.</small>
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="register-branch">Chi đoàn <span>*</span></label>
            <select id="register-branch" name="branchCode" required defaultValue="" disabled={busy}>
              <option value="" disabled>Chọn Chi đoàn</option>
              {branches.map((item) => <option value={item.code} key={item.code}>{item.code}{item.name && item.name !== item.code ? ` — ${item.name}` : ""}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="register-birth">Ngày sinh <span>*</span></label>
            <input id="register-birth" name="birthDate" type="date" required min="1900-01-01" disabled={busy} />
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="register-phone">Số điện thoại <span>*</span></label>
          <input id="register-phone" name="phone" type="tel" required placeholder="09xxxxxxxx" pattern="(0[0-9]{9}|\+84[0-9]{9})" autoComplete="tel" disabled={busy} />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="register-password">Mật khẩu <span>*</span></label>
            <div className={styles.password}>
              <input id="register-password" name="password" type={showPassword ? "text" : "password"} required minLength={12} maxLength={128} autoComplete="new-password" placeholder="Tối thiểu 12 ký tự" disabled={busy} />
              <button type="button" onClick={() => setShowPassword((x) => !x)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="register-confirm-password">Nhập lại mật khẩu <span>*</span></label>
            <input id="register-confirm-password" name="confirmPassword" type={showPassword ? "text" : "password"} required minLength={12} maxLength={128} autoComplete="new-password" placeholder="Nhập lại mật khẩu" disabled={busy} />
          </div>
        </div>
        <p className={styles.rules}>Mật khẩu cần ít nhất 12 ký tự, gồm chữ và số. Tài khoản chỉ được dùng sau khi xác nhận email trường.</p>
        <button className={styles.submit} type="submit" disabled={busy || branches.length === 0}>
          {busy ? <><Loader2 size={18} className={styles.spin} /> Đang tạo tài khoản...</> : <>Đăng ký và gửi email xác nhận <ArrowRight size={18} /></>}
        </button>
        {branches.length === 0 && <p className={styles.error}>Chưa tải được danh sách Chi đoàn. Vui lòng thử tải lại trang.</p>}
      </form>
      <p className={styles.signin}>Đã có tài khoản? <Link href="/login">Đăng nhập ngay</Link></p>
    </div>
  );
}
