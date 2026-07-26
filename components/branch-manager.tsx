"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch, UnitAccountSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Credentials = { email: string; password: string; title: string };

export function BranchManager({
  branches,
  accounts,
  canManage,
}: {
  branches: Branch[];
  accounts: UnitAccountSummary[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busyCode, setBusyCode] = useState("");
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const accountByBranch = new Map(
    accounts.filter((a) => a.branch_code).map((a) => [a.branch_code as string, a])
  );
  const missingAccounts = branches.filter((b) => b.is_active && !accountByBranch.has(b.code));

  async function addBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setCredentials(null);
    setBusyCode("new");
    const form = new FormData(event.currentTarget);
    const r = await fetch("/api/admin/branches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: form.get("code"), name: form.get("name") }),
    });
    const d = await r.json();
    if (r.ok) {
      setMessage("Đã thêm Chi đoàn và cấp tài khoản đăng nhập.");
      setCredentials({ title: `Tài khoản Chi đoàn ${d.branch.code}`, email: d.account.email, password: d.account.password });
      event.currentTarget.reset();
      router.refresh();
    } else {
      setMessage(d.error || "Không thể thêm Chi đoàn");
    }
    setBusyCode("");
  }

  async function provision(code?: string, allMissing = false) {
    setBusyCode(allMissing ? "all" : code || "");
    setMessage("");
    setCredentials(null);
    const r = await fetch("/api/admin/branches", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, allMissing }),
    });
    const d = await r.json();
    if (r.ok) {
      const first = d.accounts?.[0];
      setMessage(allMissing ? `Đã cấp hoặc đặt lại ${d.accounts.length} tài khoản Chi đoàn.` : "Đã cấp lại tài khoản và mật khẩu mặc định.");
      if (!allMissing && first) setCredentials({ title: `Tài khoản Chi đoàn ${code}`, email: first.email, password: first.password });
      router.refresh();
    } else {
      setMessage(d.error || "Không thể cấp tài khoản");
    }
    setBusyCode("");
  }

  async function toggle(branch: Branch) {
    setMessage("");
    setCredentials(null);
    setBusyCode(branch.code);
    const r = await fetch("/api/admin/branches", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: branch.code, name: branch.name, isActive: !branch.is_active }),
    });
    const d = await r.json();
    setMessage(r.ok ? `Đã ${branch.is_active ? "ngừng" : "kích hoạt"} Chi đoàn ${branch.code} và đồng bộ tài khoản.` : d.error || "Không thể cập nhật");
    setBusyCode("");
    if (r.ok) router.refresh();
  }

  return (
    <>
      {canManage && (
        <form className="card card-body mb-4" onSubmit={addBranch}>
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Thêm Chi đoàn và cấp tài khoản</h3>
            <p className="text-sm text-secondary">Hệ thống tự tạo email theo mã Chi đoàn, mật khẩu mặc định 123456 và yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.</p>
          </div>

          {message && <div className={`notice ${message.startsWith("Đã") ? "notice-success" : "notice-error"} mb-4`}>{message}</div>}

          {credentials && (
            <div className="credential-grid">
              <div className="credential-item">
                <span>{credentials.title}</span>
                <strong>{credentials.email}</strong>
              </div>
              <div className="credential-item">
                <span>Mật khẩu khởi tạo</span>
                <strong>{credentials.password}</strong>
              </div>
            </div>
          )}

          <div className="form-grid">
            <div className="field">
              <label className="field-label">Mã Chi đoàn *</label>
              <input className="input" name="code" required placeholder="Ví dụ: 26DTH1" pattern="[A-Za-z0-9_-]+" />
            </div>
            <div className="field">
              <label className="field-label">Tên hiển thị</label>
              <input className="input" name="name" placeholder="Mặc định giống mã Chi đoàn" />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap mt-4">
            <Button variant="primary" loading={busyCode === "new"}>
              Thêm và cấp tài khoản
            </Button>
            {missingAccounts.length > 0 && (
              <Button variant="outline" loading={busyCode === "all"} onClick={() => provision(undefined, true)}>
                Cấp tài khoản cho {missingAccounts.length} Chi đoàn còn thiếu
              </Button>
            )}
          </div>
        </form>
      )}

      <div className="card card-body">
        <div className="table-wrap table-responsive-card">
          <table className="table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên hiển thị</th>
                <th>Tài khoản</th>
                <th>Trạng thái</th>
                {canManage && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => {
                const account = accountByBranch.get(branch.code);
                return (
                  <tr key={branch.code}>
                    <td data-label="Mã"><b>{branch.code}</b></td>
                    <td data-label="Tên hiển thị">{branch.name}</td>
                    <td data-label="Tài khoản">
                      {account ? (
                        <>
                          <b>{account.email}</b>
                          <br />
                          <span className="text-xs text-secondary">
                            {account.must_change_password ? "Chưa đổi mật khẩu lần đầu" : "Đã đổi mật khẩu"}
                          </span>
                        </>
                      ) : (
                        <span className="badge badge-gray">Chưa cấp</span>
                      )}
                    </td>
                    <td data-label="Trạng thái">
                      <span className={`badge ${branch.is_active ? "badge-green" : "badge-gray"}`}>
                        {branch.is_active ? "Đang sử dụng" : "Ngừng sử dụng"}
                      </span>
                    </td>
                    {canManage && (
                      <td data-label="Thao tác">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" loading={busyCode === branch.code} onClick={() => provision(branch.code)}>
                            {account ? "Đặt lại 123456" : "Cấp tài khoản"}
                          </Button>
                          <Button size="sm" variant={branch.is_active ? "danger" : "primary"} loading={busyCode === branch.code} onClick={() => toggle(branch)}>
                            {branch.is_active ? "Ngừng sử dụng" : "Kích hoạt"}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {!branches.length && (
                <tr>
                  <td colSpan={canManage ? 5 : 4}>
                    <div className="empty-state">
                      <p className="text-sm text-secondary">Chưa có Chi đoàn.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
