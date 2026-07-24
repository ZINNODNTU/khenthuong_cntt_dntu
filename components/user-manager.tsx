"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Checkbox } from "@/components/ui/input";

const roleNames = { admin: "Quản trị viên", reviewer: "Cán bộ xét duyệt", submitter: "Người nộp hồ sơ" } as const;
const scopeNames = { individual: "Cá nhân", branch: "Đại diện Chi đoàn", club: "Đại diện CLB" } as const;

export function UserManager({
  users,
  branches,
  currentUserId,
}: {
  users: Profile[];
  branches: string[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Profile["role"]>("submitter");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("new");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        fullName: form.get("fullName"),
        password: form.get("password"),
        role,
        submissionScope: "individual",
        branchCode: role === "submitter" ? form.get("branchCode") : "",
        clubId: null,
      }),
    });
    const d = await r.json();
    setMessage(r.ok ? "Đã tạo tài khoản và xác nhận email." : d.error || "Không thể tạo tài khoản");
    setBusy("");
    if (r.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;
    setBusy(resetTarget.id);
    setMessage("");
    const r = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reset_password", userId: resetTarget.id, password: newPassword }),
    });
    const d = await r.json();
    setMessage(r.ok ? `Đã đặt lại mật khẩu cho ${resetTarget.email}.` : d.error || "Không thể đặt lại mật khẩu");
    setBusy("");
    if (r.ok) {
      setResetTarget(null);
      setNewPassword("");
      router.refresh();
    }
  }

  async function toggle(user: Profile) {
    setBusy(user.id);
    setMessage("");
    const r = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "set_active", userId: user.id, isActive: !user.is_active }),
    });
    const d = await r.json();
    setMessage(r.ok ? "Đã cập nhật trạng thái tài khoản." : d.error || "Không thể cập nhật tài khoản");
    setBusy("");
    if (r.ok) router.refresh();
  }

  return (
    <>
      <form className="card card-body" onSubmit={create} style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ marginBottom: "var(--space-4)" }}>
          <h3 className="font-semibold" style={{ fontSize: "var(--font-size-lg)" }}>Tạo tài khoản cá nhân hoặc cán bộ</h3>
          <p className="text-sm text-secondary">
            Tài khoản Chi đoàn được cấp tại{" "}
            <Link href="/branches" style={{ color: "var(--color-primary)", fontWeight: "var(--font-weight-medium)" }}>Quản lý Chi đoàn</Link>
            ; tài khoản CLB được cấp tại{" "}
            <Link href="/clubs" style={{ color: "var(--color-primary)", fontWeight: "var(--font-weight-medium)" }}>Quản lý CLB</Link>.
          </p>
        </div>

        {message && <div className={`notice ${message.startsWith("Đã") ? "notice-success" : "notice-error"} mb-4`}>{message}</div>}

        <div className="form-grid">
          <div className="field">
            <label className="field-label">Họ và tên *</label>
            <input className="input" name="fullName" required />
          </div>
          <div className="field">
            <label className="field-label">Email *</label>
            <input className="input" name="email" type="email" required placeholder={role === "submitter" ? "MSSV@dntu.edu.vn" : "canbo@dntu.edu.vn"} />
            {role === "submitter" && <span className="field-helper">MSSV được lấy tự động từ phần số trước @dntu.edu.vn.</span>}
          </div>
          <div className="field">
            <label className="field-label">Mật khẩu ban đầu *</label>
            <input className="input" name="password" type="password" required minLength={10} autoComplete="new-password" />
          </div>
          <div className="field">
            <label className="field-label">Vai trò</label>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as Profile["role"])}>
              <option value="submitter">Người nộp hồ sơ cá nhân</option>
              <option value="reviewer">Cán bộ xét duyệt</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>
          {role === "submitter" && (
            <div className="field">
              <label className="field-label">Chi đoàn *</label>
              <select className="select" name="branchCode" required>
                <option value="">Chọn Chi đoàn</option>
                {branches.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
          )}
        </div>

        <Button variant="primary" loading={busy === "new"} style={{ marginTop: "var(--space-4)" }}>
          Tạo tài khoản
        </Button>
      </form>

      <div className="card card-body">
        <div className="table-wrap table-responsive-card">
          <table className="table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Phạm vi</th>
                <th>Đơn vị</th>
                <th>Mật khẩu</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td data-label="Họ tên">
                    <b>{user.full_name}</b>
                    {user.id === currentUserId && <br />}
                    {user.id === currentUserId && <span className="text-xs text-secondary">Tài khoản đang đăng nhập</span>}
                  </td>
                  <td data-label="Email" className="text-sm">{user.email}</td>
                  <td data-label="Vai trò" className="text-sm">{roleNames[user.role]}</td>
                  <td data-label="Phạm vi" className="text-sm">{user.role === "submitter" ? scopeNames[user.submission_scope] : "—"}</td>
                  <td data-label="Đơn vị" className="text-sm">{user.branch_code || (user.club_id ? "CLB" : "—")}</td>
                  <td data-label="Mật khẩu">
                    {user.must_change_password ? (
                      <span className="badge badge-yellow">Phải đổi lần đầu</span>
                    ) : (
                      <span className="text-sm text-secondary">Đã thiết lập</span>
                    )}
                  </td>
                  <td data-label="Trạng thái">
                    <span className={`badge ${user.is_active ? "badge-green" : "badge-red"}`}>
                      {user.is_active ? "Đang hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td data-label="Thao tác">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setResetTarget(user); setNewPassword(""); }}>
                        Đặt lại mật khẩu
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_active ? "danger" : "primary"}
                        loading={busy === user.id}
                        disabled={user.id === currentUserId}
                        onClick={() => toggle(user)}
                      >
                        {user.is_active ? "Khóa" : "Kích hoạt"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Đặt lại mật khẩu"
        description={resetTarget ? `${resetTarget.full_name} · ${resetTarget.email}` : ""}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setResetTarget(null)}>Hủy</Button>
            <Button variant="primary" loading={resetTarget ? busy === resetTarget.id : false} form="reset-form">
              Xác nhận đặt lại
            </Button>
          </div>
        }
      >
        <form id="reset-form" onSubmit={resetPassword}>
          <div className="field">
            <label className="field-label" htmlFor="new-password">Mật khẩu mới *</label>
            <input
              id="new-password"
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={10}
              required
              autoFocus
              autoComplete="new-password"
            />
            <span className="field-helper">Tối thiểu 10 ký tự, có chữ và số. Người dùng phải đổi lại sau lần đăng nhập tiếp theo.</span>
          </div>
        </form>
      </Modal>
    </>
  );
}
