"use client";

import Link from "next/link";
import { useState } from "react";

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

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSuccess(false);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: String(form.get("fullName") || "").trim(),
          branchCode: String(form.get("branchCode") || ""),
          studentId: String(form.get("studentId") || "").trim(),
          password: String(form.get("password") || ""),
          confirmPassword: String(
            form.get("confirmPassword") || "",
          ),
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        requiresConfirmation?: boolean;
        email?: string;
      };

      if (!response.ok) {
        setMessage(
          result.error ||
            "Không thể tạo tài khoản. Vui lòng thử lại.",
        );
        return;
      }

      setSuccess(true);
      formElement.reset();

      if (result.requiresConfirmation) {
        setMessage(
          senderAddress
            ? `Đăng ký thành công. Email xác nhận được gửi từ ${senderAddress}. Hãy kiểm tra Hộp thư đến và Spam.`
            : "Đăng ký thành công. Hãy kiểm tra Hộp thư đến và Spam để xác nhận tài khoản.",
        );
      } else {
        setMessage(
          "Tài khoản đã được tạo. Bạn có thể quay về trang đăng nhập.",
        );
      }
    } catch {
      setMessage(
        "Không thể kết nối máy chủ đăng ký. Vui lòng kiểm tra mạng và thử lại.",
      );
    } finally {
      setBusy(false);
    }
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
            maxLength={200}
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
              <option key={branch} value={branch}>
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
              minLength={5}
              maxLength={20}
              inputMode="numeric"
              autoComplete="username"
              placeholder="Nhập MSSV"
              pattern="[0-9]+"
            />

            <span>@dntu.edu.vn</span>
          </div>

          <small>
            Mỗi MSSV chỉ được tạo một tài khoản duy nhất.
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
            maxLength={128}
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
            maxLength={128}
            autoComplete="new-password"
          />
        </div>

        <button
          className="btn primary auth-submit"
          disabled={busy}
        >
          {busy
            ? "Đang kiểm tra và tạo tài khoản..."
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
