"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/browser";
import { loginEmailFromInput } from "@/lib/identity";
import { studentProfileComplete } from "@/lib/student-onboarding";
import styles from "./login-screen.module.css";

function queryMessage(errorCode: string | null, confirmed: string | null) {
  if (confirmed === "1") return { type: "success" as const, text: "Email đã được xác nhận. Bạn có thể đăng nhập." };
  if (errorCode === "session") return { type: "error" as const, text: "Phiên đã hết hạn. Vui lòng đăng nhập lại." };
  if (errorCode === "inactive") return { type: "error" as const, text: "Tài khoản đang bị khóa. Vui lòng liên hệ quản trị." };
  if (errorCode === "callback") return { type: "error" as const, text: "Liên kết xác nhận không hợp lệ hoặc đã hết hạn." };
  return null;
}

function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) {
    return null;
  }
  // A protected application page is valid, a login loop is not.
  if (value === "/" || value.startsWith("/login") || value.startsWith("/register")) return null;
  return value;
}

function roleDestination(role: string) {
  if (role === "admin") return "/dashboard";
  if (role === "reviewer") return "/review";
  return "/submitter";
}

type LoginQuery = { error?: string; confirmed?: string; next?: string };

function LoginFormInner({ signupEnabled, loginQuery }: { signupEnabled: boolean; loginQuery: LoginQuery }) {
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submitting = useRef(false);
  const feedback = queryMessage(loginQuery.error ?? null, loginQuery.confirmed ?? null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setSlow(false);
    setError("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const slowTimer = window.setTimeout(() => setSlow(true), 6500);
    let navigating = false;

    try {
      if (!username || !password) {
        setError("Vui lòng nhập tài khoản và mật khẩu.");
        return;
      }

      const client = createClient();
      const { data, error: loginError } = await client.auth.signInWithPassword({
        email: loginEmailFromInput(username),
        password,
      });

      if (loginError || !data.user) {
        setError(
          loginError?.message.toLowerCase().includes("email not confirmed")
            ? "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư."
            : "Tài khoản hoặc mật khẩu không chính xác."
        );
        return;
      }

      // Resolve the role once and navigate straight to the actual portal.
      // The destination still performs its own server-side authorization.
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("role,is_active,must_change_password,submission_scope,email,full_name,branch_code,phone,birth_date,profile_completed_at")
        .eq("id", data.user.id)
        .maybeSingle();

      const target = profileError
        ? "/"
        : !profile
          ? "/401?reason=profile-missing"
          : !profile.is_active
            ? "/403?reason=inactive"
            : profile.must_change_password
              ? "/change-password"
              : profile.role === "submitter" && profile.submission_scope === "individual" && (!data.user.email_confirmed_at || !studentProfileComplete(profile))
                ? "/complete-profile"
                : safeNext(loginQuery.next ?? null) || roleDestination(profile.role);

      navigating = true;
      // A single native navigation avoids replace() + refresh() and the
      // intermediate home-page profile lookup/redirect waterfall.
      window.location.replace(target);
    } catch {
      setError("Không thể kết nối dịch vụ đăng nhập. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      window.clearTimeout(slowTimer);
      if (!navigating) {
        submitting.current = false;
        setLoading(false);
        setSlow(false);
      }
    }
  }

  return (
    <div className={styles.formArea}>
      {(error || feedback) && (
        <div
          className={error || feedback?.type === "error" ? styles.error : styles.success}
          role="alert"
        >
          {error || feedback?.text}
        </div>
      )}

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="login-email">Tài khoản đăng nhập</label>
          <div className={styles.inputWrap}>
            <UserRound className={styles.inputIcon} size={19} aria-hidden="true" />
            <input
              id="login-email"
              name="email"
              type="text"
              placeholder="MSSV, mã đơn vị hoặc email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={160}
              disabled={loading}
              autoFocus
            />
          </div>
          <p className={styles.fieldHint}>Ví dụ: 22DTH1, mã số sinh viên hoặc admin@dntu.edu.vn</p>
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="login-password">Mật khẩu</label>
            <span className={styles.secureLabel}><LockKeyhole size={13} aria-hidden="true" /> Bảo mật</span>
          </div>
          <div className={styles.inputWrap}>
            <LockKeyhole className={styles.inputIcon} size={19} aria-hidden="true" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu của bạn"
              autoComplete="current-password"
              required
              minLength={1}
              maxLength={128}
              disabled={loading}
            />
            <button
              type="button"
              className={styles.showPassword}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>

        <button className={styles.submit} type="submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <><span className={styles.spinner} aria-hidden="true" /> Đang xác thực...</>
          ) : (
            <>Đăng nhập hệ thống <ArrowRight size={19} aria-hidden="true" /></>
          )}
        </button>
        {slow && loading && (
          <p role="status" className={styles.slowNote}>
            Kết nối đang mất nhiều thời gian hơn bình thường. Hệ thống vẫn đang thử đăng nhập...
          </p>
        )}
      </form>

      {signupEnabled && (
        <p className={styles.signup}>Chưa có tài khoản? <Link href="/register" prefetch={false}>Đăng ký bằng MSSV <ArrowRight size={14} /></Link></p>
      )}
      <div className={styles.formBottom}>
        <ShieldCheck size={17} aria-hidden="true" />
        <span>Dữ liệu hồ sơ được bảo vệ và phân quyền theo tài khoản.</span>
      </div>
    </div>
  );
}

export function LoginScreen({ signupEnabled, loginQuery = {} }: { signupEnabled: boolean; loginQuery?: LoginQuery }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.showcase} aria-label="Giới thiệu hệ thống xét khen thưởng">
          <header className={styles.brand}>
            <span className={styles.brandEmblem}><BrandLogo size={46} priority /></span>
            <span className={styles.brandText}>
              <strong>KHOA CÔNG NGHỆ THÔNG TIN</strong>
              <span>TRƯỜNG ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI</span>
            </span>
          </header>
          <div className={styles.hero}>
            <div className={styles.heroBadge}>KHEN THƯỞNG ĐOÀN – HỘI · KHOA CNTT</div>
            <h1>Xét khen thưởng<br /><em>Đoàn – Hội<br />Khoa CNTT.</em></h1>
            <p>Website tiếp nhận hồ sơ khen thưởng cá nhân tham gia công tác Đoàn – Hội và phong trào sinh viên Khoa Công nghệ thông tin.</p>
            <div className={styles.process}>
              <div className={styles.processHeading}>QUY TRÌNH THỰC HIỆN</div>
              <div className={styles.processSteps}>
                <div className={styles.step}>
                  <span className={styles.stepNumber}>01</span>
                  <div><strong>Gửi hồ sơ</strong><span>Điền thông tin và đính kèm tài liệu</span></div>
                </div>
                <div className={styles.step}>
                  <span className={styles.stepNumber}>02</span>
                  <div><strong>Đối chiếu minh chứng</strong><span>Xét theo 09 tiêu chí cá nhân C1–C9</span></div>
                </div>
                <div className={styles.step}>
                  <span className={styles.stepNumber}>03</span>
                  <div><strong>Nhận kết quả</strong><span>Theo dõi quyết định và yêu cầu bổ sung</span></div>
                </div>
              </div>
            </div>
          </div>
          <footer className={styles.showcaseFooter}><span>© {new Date().getFullYear()} Khoa Công nghệ thông tin · DNTU</span><span>Khen thưởng Đoàn – Hội</span></footer>
        </aside>

        <section className={styles.formSide} aria-labelledby="login-title">
          <div className={styles.mobileBrand}><BrandLogo size={39} priority /><span><strong>KHOA CNTT</strong><small>TRƯỜNG ĐẠI HỌC DNTU</small></span></div>
          <div className={styles.formContent}>
            <div className={styles.welcomeBadge}>CỔNG HỒ SƠ · KHOA CNTT</div>
            <h2 id="login-title" className={styles.title}>Đăng nhập</h2>
            <p className={styles.subtitle}>Sử dụng tài khoản được cấp hoặc MSSV để tiếp tục.</p>
            <LoginFormInner signupEnabled={signupEnabled} loginQuery={loginQuery} />
          </div>
          <div className={styles.formFooter}>
            <span>Trường Đại học Công nghệ Đồng Nai · Khoa CNTT</span>
          </div>
        </section>
      </div>
    </main>
  );
}
