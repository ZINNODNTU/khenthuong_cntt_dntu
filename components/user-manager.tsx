"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
const roleNames = {
    admin: "Quản trị viên",
    reviewer: "Cán bộ xét duyệt",
    submitter: "Người nộp hồ sơ",
} as const;
const scopeNames = {
    individual: "Cá nhân",
    branch: "Đại diện Chi đoàn",
    club: "Đại diện CLB",
} as const;
export function UserManager({ users, branches, currentUserId, }: {
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
        const response = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                email: form.get("email"),
                fullName: form.get("fullName"),
                password: form.get("password"),
                role,
                submissionScope: "individual",
                branchCode: role === "submitter"
                    ? form.get("branchCode")
                    : "",
                clubId: null,
            }),
        });
        const result = await response.json();
        setMessage(response.ok
            ? "Đã tạo tài khoản và xác nhận email."
            : result.error || "Không thể tạo tài khoản");
        setBusy("");
        if (response.ok) {
            event.currentTarget.reset();
            router.refresh();
        }
    }
    async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!resetTarget)
            return;
        setBusy(resetTarget.id);
        setMessage("");
        const response = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                action: "reset_password",
                userId: resetTarget.id,
                password: newPassword,
            }),
        });
        const result = await response.json();
        setMessage(response.ok
            ? `Đã đặt lại mật khẩu cho ${resetTarget.email}.`
            : result.error || "Không thể đặt lại mật khẩu");
        setBusy("");
        if (response.ok) {
            setResetTarget(null);
            setNewPassword("");
            router.refresh();
        }
    }
    async function toggle(user: Profile) {
        setBusy(user.id);
        setMessage("");
        const response = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                action: "set_active",
                userId: user.id,
                isActive: !user.is_active,
            }),
        });
        const result = await response.json();
        setMessage(response.ok
            ? "Đã cập nhật trạng thái tài khoản."
            : result.error || "Không thể cập nhật tài khoản");
        setBusy("");
        if (response.ok) {
            router.refresh();
        }
    }
    return (<>
      <form className="card section" onSubmit={create}>
        <div className="section-title">
          <div>
            <h3>Tạo tài khoản cá nhân hoặc cán bộ</h3>
            <p>
              Tài khoản Chi đoàn được cấp tại{" "}
              <Link href="/branches" className="content-link">
                Quản lý Chi đoàn
              </Link>
              ; tài khoản CLB được cấp tại{" "}
              <Link href="/clubs" className="content-link">
                Quản lý CLB
              </Link>
              .
            </p>
          </div>
        </div>

        {message && (<div className={message.startsWith("Đã")
                ? "notice success"
                : "notice error"}>
            {message}
          </div>)}

        <div className="form-grid">
          <div className="field">
            <label>Họ và tên *</label>
            <input name="fullName" required/>
          </div>

          <div className="field">
            <label>Email *</label>
            <input name="email" type="email" required placeholder={role === "submitter"
            ? "MSSV@dntu.edu.vn"
            : "canbo@dntu.edu.vn"}/>
            {role === "submitter" && (<small>
                MSSV được lấy tự động từ phần số trước
                @dntu.edu.vn.
              </small>)}
          </div>

          <div className="field">
            <label>Mật khẩu ban đầu *</label>
            <input name="password" type="password" required minLength={10} autoComplete="new-password"/>
          </div>

          <div className="field">
            <label>Vai trò</label>
            <select value={role} onChange={(event) => setRole(event.target.value as Profile["role"])}>
              <option value="submitter">
                Người nộp hồ sơ cá nhân
              </option>
              <option value="reviewer">
                Cán bộ xét duyệt
              </option>
              <option value="admin">
                Quản trị viên
              </option>
            </select>
          </div>

          {role === "submitter" && (<div className="field">
              <label>Chi đoàn *</label>
              <select name="branchCode" required>
                <option value="">Chọn Chi đoàn</option>
                {branches.map((branch) => (<option key={branch}>{branch}</option>))}
              </select>
            </div>)}
        </div>

        <button className="btn primary" disabled={busy === "new"} style={{ marginTop: 14 }}>
          {busy === "new"
            ? "Đang tạo..."
            : "Tạo tài khoản"}
        </button>
      </form>

      <div className="card panel" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table>
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
              {users.map((user) => (<tr key={user.id}>
                  <td>
                    <b>{user.full_name}</b>
                    {user.id === currentUserId && (<>
                        <br />
                        <small>
                          Tài khoản đang đăng nhập
                        </small>
                      </>)}
                  </td>

                  <td>{user.email}</td>
                  <td>{roleNames[user.role]}</td>
                  <td>
                    {user.role === "submitter"
                ? scopeNames[user.submission_scope]
                : "—"}
                  </td>
                  <td>
                    {user.branch_code ||
                (user.club_id ? "CLB" : "—")}
                  </td>
                  <td>
                    {user.must_change_password ? (<span className="status status-draft">
                        Phải đổi lần đầu
                      </span>) : ("Đã thiết lập")}
                  </td>
                  <td>
                    <span className={`status ${user.is_active
                ? "status-passed"
                : "status-failed"}`}>
                      {user.is_active
                ? "Đang hoạt động"
                : "Đã khóa"}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button type="button" className="btn" disabled={busy === user.id} onClick={() => {
                setResetTarget(user);
                setNewPassword("");
            }}>
                        Đặt lại mật khẩu
                      </button>

                      <button type="button" className={user.is_active
                ? "btn fail"
                : "btn pass"} disabled={busy === user.id ||
                user.id === currentUserId} onClick={() => toggle(user)}>
                        {user.is_active
                ? "Khóa"
                : "Kích hoạt"}
                      </button>
                    </div>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {resetTarget && (<div className="dialog-backdrop" role="presentation" onMouseDown={() => setResetTarget(null)}>
          <form className="dialog-card" onSubmit={resetPassword} onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-head">
              <div>
                <span>ĐẶT LẠI MẬT KHẨU</span>
                <h3>{resetTarget.full_name}</h3>
                <p>{resetTarget.email}</p>
              </div>

              <button type="button" className="dialog-close" onClick={() => setResetTarget(null)}>
                ×
              </button>
            </div>

            <div className="field">
              <label>Mật khẩu mới *</label>
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} required autoFocus autoComplete="new-password"/>
              <small>
                Tối thiểu 10 ký tự, có chữ và số. Người
                dùng phải đổi lại sau lần đăng nhập tiếp
                theo.
              </small>
            </div>

            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setResetTarget(null)}>
                Hủy
              </button>

              <button className="btn primary" disabled={busy === resetTarget.id}>
                {busy === resetTarget.id
                ? "Đang cập nhật..."
                : "Xác nhận đặt lại"}
              </button>
            </div>
          </form>
        </div>)}
    </>);
}

