"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
export function RegisterForm({ branches, }: {
    branches: string[];
}) {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        setSuccess(false);
        const form = new FormData(event.currentTarget);
        const studentId = String(form.get("studentId"))
            .trim();
        const email = `${studentId}@dntu.edu.vn`;
        const password = String(form.get("password"));
        const confirm = String(form.get("confirmPassword"));
        if (!/^\d+$/.test(studentId)) {
            setMessage("MSSV chỉ được gồm chữ số.");
            setBusy(false);
            return;
        }
        if (password !== confirm) {
            setMessage("Mật khẩu xác nhận không khớp.");
            setBusy(false);
            return;
        }
        if (password.length < 10 ||
            !/[A-Za-z]/.test(password) ||
            !/\d/.test(password)) {
            setMessage("Mật khẩu phải có ít nhất 10 ký tự, gồm chữ và số.");
            setBusy(false);
            return;
        }
        const client = createClient();
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                data: {
                    full_name: String(form.get("fullName")).trim(),
                    branch_code: String(form.get("branchCode")),
                    account_type: "student",
                },
            },
        });
        if (error) {
            setMessage(error.message);
            setBusy(false);
            return;
        }
        if (data.session) {
            router.replace("/");
            router.refresh();
            return;
        }
        setSuccess(true);
        setMessage("Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản.");
        setBusy(false);
    }
    return (<div className="stack">
      {message && (<div className={success
                ? "notice success"
                : "notice error"}>
          {message}
        </div>)}

      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label>Họ và tên</label>
          <input name="fullName" required minLength={2}/>
        </div>

        <div className="field">
          <label>Chi đoàn</label>
          <select name="branchCode" required defaultValue="">
            <option value="" disabled>
              Chọn Chi đoàn
            </option>
            {branches.map((branch) => (<option key={branch}>{branch}</option>))}
          </select>
        </div>

        <div className="field">
          <label>Mã số sinh viên</label>
          <div className="identity-input">
            <input name="studentId" type="text" required inputMode="numeric" autoComplete="username" placeholder="Nhập MSSV" pattern="[0-9]+"/>
            <span>@dntu.edu.vn</span>
          </div>
          <small>
            Email đăng nhập và MSSV hồ sơ được tạo tự động từ dãy số này.
          </small>
        </div>

        <div className="field">
          <label>Mật khẩu</label>
          <input name="password" type="password" required minLength={10} autoComplete="new-password"/>
          <small>
            Tối thiểu 10 ký tự, gồm chữ và số.
          </small>
        </div>

        <div className="field">
          <label>Xác nhận mật khẩu</label>
          <input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password"/>
        </div>

        <button className="btn primary auth-submit" disabled={busy}>
          {busy
            ? "Đang tạo tài khoản..."
            : "Tạo tài khoản"}
        </button>
      </form>

      <div className="auth-switch">
        Đã có tài khoản?{" "}
        <Link href="/login">Đăng nhập</Link>
      </div>
    </div>);
}

