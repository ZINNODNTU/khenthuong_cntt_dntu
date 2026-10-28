"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/browser";
import { validatePassword } from "@/lib/password-policy";
import styles from "@/components/password-recovery.module.css";

export default function ResetPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) { setError("Hai lần nhập mật khẩu chưa trùng khớp."); return; }
    setBusy(true);
    setError("");
    try {
      const client = createClient();
      const { data: { user }, error: sessionError } = await client.auth.getUser();
      if (sessionError || !user) { setError("Liên kết đã hết hạn hoặc phiên xác thực không hợp lệ. Hãy yêu cầu liên kết mới."); return; }
      const policyError = validatePassword(password, {email:user.email});
      if (policyError) { setError(policyError); return; }
      const response = await fetch("/api/account/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; auditRecorded?: boolean };
      if (!response.ok) {
        setError(result.error || "Không thể cập nhật mật khẩu. Vui lòng yêu cầu liên kết mới.");
        return;
      }
      if (result.auditRecorded === false) {
        console.warn("[password.recovery] Updated password but audit could not be recorded.");
      }
      await client.auth.signOut({scope:"local"});
      setDone(true);
    } catch {
      setError("Không thể kết nối dịch vụ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="reset-title">
        <div className={styles.brand}><BrandLogo size={47} priority /><span>KHOA CÔNG NGHỆ THÔNG TIN<br />DNTU · ĐOÀN – HỘI</span></div>
        <div className={styles.eyebrow}>BẢO MẬT TÀI KHOẢN</div>
        <h1 className={styles.title} id="reset-title">{done ? "Đặt lại mật khẩu thành công" : "Thiết lập mật khẩu mới"}</h1>
        <p className={styles.description}>{done ? "Mật khẩu đã được cập nhật. Bạn có thể đăng nhập lại bằng mật khẩu mới." : "Chọn mật khẩu đủ mạnh để tiếp tục sử dụng cổng xét khen thưởng."}</p>
        {done ? (
          <><div role="status" className={styles.message}><CheckCircle2 size={18} style={{display:"inline",marginRight:8}} />Mật khẩu đã được thay đổi.</div><Link href="/login" className={styles.back}>Đến trang đăng nhập <ArrowRight size={17} /></Link></>
        ) : (
          <>
            <form className={styles.form} onSubmit={changePassword}>
              {error && <div role="alert" className={styles.error}>{error}</div>}
              <div className={styles.field}>
                <label htmlFor="new-password">Mật khẩu mới</label>
                <input id="new-password" name="password" type={visible?"text":"password"} autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} placeholder="Ít nhất 12 ký tự" />
                <span className={styles.hint}>Sử dụng từ 12–128 ký tự, tránh mật khẩu phổ biến và thông tin cá nhân.</span>
              </div>
              <div className={styles.field}>
                <label htmlFor="confirm-password">Nhập lại mật khẩu</label>
                <input id="confirm-password" name="confirm" type={visible?"text":"password"} autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} placeholder="Nhập lại mật khẩu mới" />
                <label style={{fontWeight:500,display:"flex",alignItems:"center",gap:8}}><input style={{width:16,height:16}} type="checkbox" checked={visible} onChange={event=>setVisible(event.target.checked)} disabled={busy} />{visible ? <EyeOff size={16} /> : <Eye size={16} />} Hiện mật khẩu</label>
              </div>
              <button className={styles.button} type="submit" disabled={busy}><LockKeyhole size={18} />{busy?"Đang cập nhật...":"Xác nhận mật khẩu mới"}<ArrowRight size={17}/></button>
            </form>
            <Link href="/forgot-password" className={styles.back}><ArrowLeft size={17} /> Yêu cầu liên kết mới</Link>
          </>
        )}
      </section>
    </main>
  );
}
