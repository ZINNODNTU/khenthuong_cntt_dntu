"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("email rate limit") ||
    normalized.includes("rate limit")
  ) {
    return (
      "Hệ thống đang tạm giới hạn gửi email xác nhận. " +
      "Vui lòng thử lại sau hoặc liên hệ quản trị viên kiểm tra SMTP riêng."
    );
  }

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists")
  ) {
    return (
      "MSSV này đã có tài khoản. Vui lòng quay lại trang đăng nhập."
    );
  }

  return message;
}

export function RegisterForm({
  branches,
  senderAddress,
}: {
  branches: string[];
  senderAddress: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const router = useRouter();

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSuccess(false);

    const form = new FormData(event.currentTarget);
    const studentId = String(
      form.get("studentId"),
    ).trim();

    const email = `${studentId}@dntu.edu.vn`;
    const password = String(form.get("password"));
    const confirm = String(
      form.get("confirmPassword"),
    );

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

    if (
      password.length < 10 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setMessage(
        "Mật khẩu phải có ít nhất 10 ký tự, gồm chữ và số.",
      );
      setBusy(false);
      return;
    }

    const client = createClient();

    const confirmationUrl =
      `${window.location.origin}/auth/confirm?next=/`;

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: confirmationUrl,
        data: {
          full_name: String(
            form.get("fullName"),
          ).trim(),
          branch_code: String(
            form.get("branchCode"),
          ),
          account_type: "student",
        },
      },
    });

    if (error) {
      setMessage(authErrorMessage(error.message));
      setBusy(false);
      return;
    }

    if (data.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    setSuccess(true);
    setMessage(
      senderAddress
        ? `Đăng ký thành công. Email xác nhận được gửi từ ${senderAddress}. Hãy kiểm tra Hộp thư đến và Spam.`
        : "Đăng ký thành công. Hãy kiểm tra Hộp thư đến và Spam để xác nhận tài khoản.",
    );
    setBusy(false);
  }

  return (
    <div className="stack">
      {message && (
        <div
          className={
            success
              ? "notice success"
              : "notice error"
          }
        >
          {message}
        </div>
      )}

      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="register-name">
            Họ và tên
          </label>

          <input
            id="register-name"
            name="fullName"
            required
            minLength={2}
            autoComplete="name"
          />
        </div>

        <div className="field">
          <label htmlFor="register-branch">
            Chi đoàn
          </label>

          <select
            id="register-branch"
            name="branchCode"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Chọn Chi đoàn
            </option>

            {branches.map((branch) => (
              <option key={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="register-student-id">
            Mã số sinh viên
          </label>

          <div className="identity-input">
            <input
              id="register-student-id"
              name="studentId"
              type="text"
              required
              inputMode="numeric"
              autoComplete="username"
              placeholder="Nhập MSSV"
              pattern="[0-9]+"
            />

            <span>@dntu.edu.vn</span>
          </div>

          <small>
            Email đăng nhập và MSSV hồ sơ được tạo tự động từ dãy số này.
          </small>
        </div>

        <div className="field">
          <label htmlFor="register-password">
            Mật khẩu
          </label>

          <input
            id="register-password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
          />

          <small>
            Tối thiểu 10 ký tự, gồm chữ và số.
          </small>
        </div>

        <div className="field">
          <label htmlFor="register-confirm-password">
            Xác nhận mật khẩu
          </label>

          <input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
          />
        </div>

        <button
          className="btn primary auth-submit"
          disabled={busy}
        >
          {busy
            ? "Đang tạo tài khoản..."
            : "Tạo tài khoản"}
        </button>
      </form>

      <div className="auth-switch">
        Đã có tài khoản?{" "}
        <Link href="/">
          Đăng nhập
        </Link>
      </div>
    </div>
  );
}
