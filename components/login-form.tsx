"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { loginEmailFromInput } from "@/lib/identity";
export function LoginForm({ signupEnabled }: {
    signupEnabled: boolean;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const params = useSearchParams();
    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const form = new FormData(e.currentTarget);
        const client = createClient();
        const email = loginEmailFromInput(String(form.get("email")));
        const { error: loginError } = await client.auth.signInWithPassword({
            email,
            password: String(form.get("password")),
        });
        if (loginError) {
            setError("Email hoặc mật khẩu không đúng.");
            setLoading(false);
            return;
        }
        const requested = params.get("next");
        const target = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
        router.replace(target);
        router.refresh();
    }
    const queryError = params.get("error");
    return (<div className="stack">
      {(error || queryError) && (<div className="notice error">
          {error || (queryError === "inactive" ? "Tài khoản đã bị khóa." : "Đăng nhập không thành công.")}
        </div>)}
      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label>MSSV, mã đơn vị hoặc email</label>
          <input type="text" name="email" required placeholder="Ví dụ: 12345678 hoặc 22DTH1" autoComplete="username" inputMode="email"/>
          <small>Có thể nhập phần trước @dntu.edu.vn hoặc nhập đầy đủ email.</small>
        </div>
        <div className="field">
          <label>Mật khẩu</label>
          <input type="password" name="password" required minLength={6} autoComplete="current-password"/>
        </div>
        <button className="btn primary auth-submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
      {signupEnabled && (<div className="auth-switch">Chưa có tài khoản? <Link href="/register">Đăng ký bằng email</Link></div>)}
    </div>);
}

