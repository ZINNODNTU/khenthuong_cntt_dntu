"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Club, UnitAccountSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Credentials = { email: string; password: string; title: string };

export function ClubManager({
  clubs,
  accounts,
}: {
  clubs: Club[];
  accounts: UnitAccountSummary[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const accountByClub = new Map(
    accounts.filter((a) => a.club_id).map((a) => [a.club_id as string, a])
  );
  const missingAccounts = clubs.filter((c) => c.is_active && !accountByClub.has(c.id));

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("new");
    setMessage("");
    setCredentials(null);
    const form = new FormData(event.currentTarget);
    const r = await fetch("/api/admin/clubs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: form.get("code"), name: form.get("name") }),
    });
    const d = await r.json();
    if (r.ok) {
      setMessage("Đã thêm CLB và cấp tài khoản đăng nhập.");
      setCredentials({ title: `Tài khoản ${d.club.name}`, email: d.account.email, password: d.account.password });
      event.currentTarget.reset();
      router.refresh();
    } else {
      setMessage(d.error || "Không thể thêm CLB");
    }
    setBusy("");
  }

  async function provision(id?: string, allMissing = false) {
    setBusy(allMissing ? "all" : id || "");
    setMessage("");
    setCredentials(null);
    const r = await fetch("/api/admin/clubs", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, allMissing }),
    });
    const d = await r.json();
    if (r.ok) {
      const first = d.accounts?.[0];
      setMessage(allMissing ? `Đã cấp hoặc đặt lại ${d.accounts.length} tài khoản CLB.` : "Đã cấp lại tài khoản và mật khẩu mặc định.");
      if (!allMissing && first) {
        const club = clubs.find((c) => c.id === id);
        setCredentials({ title: `Tài khoản ${club?.name || "CLB"}`, email: first.email, password: first.password });
      }
      router.refresh();
    } else {
      setMessage(d.error || "Không thể cấp tài khoản CLB");
    }
    setBusy("");
  }

  async function toggle(club: Club) {
    setBusy(club.id);
    setMessage("");
    setCredentials(null);
    const r = await fetch("/api/admin/clubs", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: club.id, code: club.code, name: club.name, isActive: !club.is_active }),
    });
    const d = await r.json();
    setMessage(r.ok ? "Đã cập nhật CLB và đồng bộ tài khoản." : d.error || "Không thể cập nhật CLB");
    setBusy("");
    if (r.ok) router.refresh();
  }

  return (
    <>
      <form className="card card-body" onSubmit={create} style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ marginBottom: "var(--space-4)" }}>
          <h3 className="font-semibold" style={{ fontSize: "var(--font-size-lg)" }}>Thêm CLB và cấp tài khoản</h3>
          <p className="text-sm text-secondary">Hệ thống tự tạo email từ mã CLB, mật khẩu mặc định 123456 và yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.</p>
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
            <label className="field-label">Mã CLB *</label>
            <input className="input" name="code" required placeholder="Ví dụ: CLB-AI" pattern="[A-Za-z0-9_-]+" />
          </div>
          <div className="field">
            <label className="field-label">Tên CLB *</label>
            <input className="input" name="name" required placeholder="Câu lạc bộ Trí tuệ nhân tạo" />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap" style={{ marginTop: "var(--space-4)" }}>
          <Button variant="primary" loading={busy === "new"}>Thêm và cấp tài khoản</Button>
          {missingAccounts.length > 0 && (
            <Button variant="outline" loading={busy === "all"} onClick={() => provision(undefined, true)}>
              Cấp tài khoản cho {missingAccounts.length} CLB còn thiếu
            </Button>
          )}
        </div>
      </form>

      <div className="card card-body">
        <div className="table-wrap table-responsive-card">
          <table className="table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên CLB</th>
                <th>Tài khoản</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => {
                const account = accountByClub.get(club.id);
                return (
                  <tr key={club.id}>
                    <td data-label="Mã"><b>{club.code}</b></td>
                    <td data-label="Tên CLB">{club.name}</td>
                    <td data-label="Tài khoản">
                      {account ? (
                        <>
                          <b>{account.email}</b>
                          <br />
                          <span className="text-xs text-secondary">{account.must_change_password ? "Chưa đổi mật khẩu lần đầu" : "Đã đổi mật khẩu"}</span>
                        </>
                      ) : (
                        <span className="badge badge-gray">Chưa cấp</span>
                      )}
                    </td>
                    <td data-label="Trạng thái"><span className={`badge ${club.is_active ? "badge-green" : "badge-gray"}`}>{club.is_active ? "Đang sử dụng" : "Ngừng sử dụng"}</span></td>
                    <td data-label="Thao tác">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" loading={busy === club.id} onClick={() => provision(club.id)}>
                          {account ? "Đặt lại 123456" : "Cấp tài khoản"}
                        </Button>
                        <Button size="sm" variant={club.is_active ? "danger" : "primary"} loading={busy === club.id} onClick={() => toggle(club)}>
                          {club.is_active ? "Ngừng sử dụng" : "Kích hoạt"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!clubs.length && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state"><p className="text-sm text-secondary">Chưa có CLB.</p></div>
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
