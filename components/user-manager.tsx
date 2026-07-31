"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";

const roleNames = { admin: "Quản trị viên", reviewer: "Cán bộ xét duyệt", submitter: "Người nộp hồ sơ" } as const;
const scopeNames = { individual: "Cá nhân", branch: "Đại diện Chi đoàn", club: "Đại diện CLB" } as const;

function statusHtml(isActive: boolean) {
  return `<span class="badge ${isActive ? "badge-green" : "badge-red"}">${isActive ? "Đang hoạt động" : "Đã khóa"}</span>`;
}

const columns: ColumnDef[] = [
  { key: "full_name", label: "Họ tên", sortable: true },
  { key: "email", label: "Email", hideOnMobile: true, sortable: true },
  { key: "role", label: "Vai trò", sortable: true },
  { key: "submission_scope", label: "Phạm vi", hideOnMobile: true },
  { key: "branch_code", label: "Đơn vị", hideOnMobile: true },
  { key: "must_change_password", label: "Mật khẩu" },
  { key: "is_active", label: "Trạng thái" },
];

export function UserManager({
  users, branches, currentUserId,
}: {
  users: Profile[]; branches: string[]; currentUserId: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Profile["role"]>("submitter");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 4000); }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("new");
    const form = new FormData(event.currentTarget);
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"), fullName: form.get("fullName"),
        password: form.get("password"), role,
        submissionScope: "individual",
        branchCode: role === "submitter" ? form.get("branchCode") : "", clubId: null,
      }),
    });
    const d = await r.json();
    setBusy("");
    if (r.ok) { event.currentTarget.reset(); router.refresh(); showToast("Đã tạo tài khoản."); }
    else { showToast(d.error || "Không thể tạo"); }
  }

  async function toggle(user: Profile) {
    setBusy(user.id);
    const r = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "set_active", userId: user.id, isActive: !user.is_active }),
    });
    setBusy("");
    if (r.ok) { router.refresh(); showToast("Đã cập nhật trạng thái."); }
    else { showToast("Không thể cập nhật"); }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;
    setBusy(resetTarget.id);
    const r = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reset_password", userId: resetTarget.id, password: newPassword }),
    });
    setBusy("");
    if (r.ok) { setResetTarget(null); setNewPassword(""); router.refresh(); showToast("Đã đặt lại mật khẩu."); }
    else { showToast("Không thể đặt lại"); }
  }

  const rows = users.map((u) => ({
    id: u.id,
    full_name: u.id === currentUserId ? `${u.full_name} (đang đăng nhập)` : u.full_name,
    email: u.email,
    role: roleNames[u.role],
    submission_scope: u.role === "submitter" ? scopeNames[u.submission_scope] : "—",
    branch_code: u.branch_code || (u.club_id ? "CLB" : "—"),
    must_change_password: u.must_change_password ? "Phải đổi lần đầu" : "Đã thiết lập",
    is_active: u.is_active ? "Đang hoạt động" : "Đã khóa",
  }));

  return (
    <>
      {/* Toast */}
      {toast && <div className="toast" role="alert">{toast}</div>}

      {/* Create form */}
      <form className="card card-body mb-4" onSubmit={create}>
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Tạo tài khoản</h3>
          <p className="text-sm text-secondary">
            Tài khoản Chi đoàn được cấp tại <Link href="/branches" className="link-primary">Quản lý Chi đoàn</Link>; CLB tại <Link href="/clubs" className="link-primary">Quản lý CLB</Link>.
          </p>
        </div>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">Họ và tên *</label>
            <input className="input" name="fullName" required />
          </div>
          <div className="field">
            <label className="field-label">Email *</label>
            <input className="input" name="email" type="email" required placeholder={role === "submitter" ? "MSSV@dntu.edu.vn" : "canbo@dntu.edu.vn"} />
            {role === "submitter" && <span className="field-helper">MSSV lấy từ phần số trước @dntu.edu.vn.</span>}
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
        <Button variant="primary" loading={busy === "new"} className="mt-4">Tạo tài khoản</Button>
      </form>

      {/* Table */}
      <DataTable
        columns={columns}
        data={rows as unknown as Record<string, unknown>[]}
        clientSearch
        searchPlaceholder="Tìm theo tên, email..."
        selectable
        rowActions={(u) => {
          const profile = users.find((p) => p.id === u.id)!;
          return (
            <>
              <button type="button" className="topbar-dropdown-item" role="menuitem" onClick={() => { setResetTarget(profile); setNewPassword(""); }}>
                Đặt lại mật khẩu
              </button>
              <button type="button" className={`topbar-dropdown-item ${profile.is_active ? "topbar-dropdown-item-danger" : ""}`} role="menuitem" disabled={profile.id === currentUserId} onClick={() => toggle(profile)}>
                {profile.is_active ? "Khóa tài khoản" : "Kích hoạt"}
              </button>
            </>
          );
        }}
      />

      {/* Reset password modal */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Đặt lại mật khẩu"
        description={resetTarget ? `${resetTarget.full_name} · ${resetTarget.email}` : ""}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setResetTarget(null)}>Hủy</Button>
            <Button variant="primary" loading={resetTarget ? busy === resetTarget.id : false} form="reset-form">Xác nhận</Button>
          </div>
        }
      >
        <form id="reset-form" onSubmit={resetPassword}>
          <div className="field">
            <label className="field-label" htmlFor="new-password">Mật khẩu mới *</label>
            <input id="new-password" className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={10} required autoFocus autoComplete="new-password" />
            <span className="field-helper">Tối thiểu 10 ký tự. Người dùng phải đổi lại sau lần đăng nhập tiếp theo.</span>
          </div>
        </form>
      </Modal>
    </>
  );
}
