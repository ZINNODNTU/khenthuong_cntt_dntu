"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Club, UnitAccountSummary, } from "@/lib/types";
type Credentials = {
    email: string;
    password: string;
    title: string;
};
export function ClubManager({ clubs, accounts, }: {
    clubs: Club[];
    accounts: UnitAccountSummary[];
}) {
    const router = useRouter();
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState("");
    const [credentials, setCredentials] = useState<Credentials | null>(null);
    const accountByClub = useMemo(() => new Map(accounts
        .filter((account) => account.club_id)
        .map((account) => [account.club_id as string, account] as const)), [accounts]);
    const missingAccounts = clubs.filter((club) => club.is_active && !accountByClub.has(club.id));
    async function create(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy("new");
        setMessage("");
        setCredentials(null);
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/admin/clubs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                code: form.get("code"),
                name: form.get("name"),
            }),
        });
        const data = await response.json();
        if (response.ok) {
            setMessage("Đã thêm CLB và cấp tài khoản đăng nhập.");
            setCredentials({
                title: `Tài khoản ${data.club.name}`,
                email: data.account.email,
                password: data.account.password,
            });
            event.currentTarget.reset();
            router.refresh();
        }
        else {
            setMessage(data.error || "Không thể thêm CLB");
        }
        setBusy("");
    }
    async function provision(id?: string, allMissing = false) {
        setBusy(allMissing ? "all" : id || "");
        setMessage("");
        setCredentials(null);
        const response = await fetch("/api/admin/clubs", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id, allMissing }),
        });
        const data = await response.json();
        if (response.ok) {
            const first = data.accounts?.[0];
            setMessage(allMissing
                ? `Đã cấp hoặc đặt lại ${data.accounts.length} tài khoản CLB.`
                : "Đã cấp lại tài khoản và mật khẩu mặc định.");
            if (!allMissing && first) {
                const club = clubs.find((item) => item.id === id);
                setCredentials({
                    title: `Tài khoản ${club?.name || "CLB"}`,
                    email: first.email,
                    password: first.password,
                });
            }
            router.refresh();
        }
        else {
            setMessage(data.error || "Không thể cấp tài khoản CLB");
        }
        setBusy("");
    }
    async function toggle(club: Club) {
        setBusy(club.id);
        setMessage("");
        setCredentials(null);
        const response = await fetch("/api/admin/clubs", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                id: club.id,
                code: club.code,
                name: club.name,
                isActive: !club.is_active,
            }),
        });
        const data = await response.json();
        setMessage(response.ok
            ? "Đã cập nhật CLB và đồng bộ tài khoản."
            : data.error || "Không thể cập nhật CLB");
        setBusy("");
        if (response.ok) {
            router.refresh();
        }
    }
    return (<>
      <form className="card section" onSubmit={create}>
        <div className="section-title">
          <div>
            <h3>Thêm CLB và cấp tài khoản</h3>
            <p>
              Hệ thống tự tạo email từ mã CLB, mật khẩu
              mặc định 123456 và yêu cầu đổi mật khẩu ở
              lần đăng nhập đầu tiên.
            </p>
          </div>
        </div>

        {message && (<div className={message.startsWith("Đã")
                ? "notice success"
                : "notice error"}>
            {message}
          </div>)}

        {credentials && (<div className="credential-card">
            <div>
              <span>{credentials.title}</span>
              <strong>{credentials.email}</strong>
            </div>
            <div>
              <span>Mật khẩu khởi tạo</span>
              <strong>{credentials.password}</strong>
            </div>
          </div>)}

        <div className="form-grid">
          <div className="field">
            <label>Mã CLB *</label>
            <input name="code" required placeholder="Ví dụ: CLB-AI" pattern="[A-Za-z0-9_-]+"/>
          </div>

          <div className="field">
            <label>Tên CLB *</label>
            <input name="name" required placeholder="Câu lạc bộ Trí tuệ nhân tạo"/>
          </div>
        </div>

        <div className="actions" style={{ marginTop: 14 }}>
          <button className="btn primary" disabled={busy === "new"}>
            {busy === "new"
            ? "Đang tạo..."
            : "Thêm và cấp tài khoản"}
          </button>

          {missingAccounts.length > 0 && (<button type="button" className="btn" disabled={busy === "all"} onClick={() => provision(undefined, true)}>
              {busy === "all"
                ? "Đang cấp..."
                : `Cấp tài khoản cho ${missingAccounts.length} CLB còn thiếu`}
            </button>)}
        </div>
      </form>

      <div className="card panel" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table>
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
            return (<tr key={club.id}>
                    <td>
                      <b>{club.code}</b>
                    </td>
                    <td>{club.name}</td>
                    <td>
                      {account ? (<>
                          <b>{account.email}</b>
                          <br />
                          <small>
                            {account.must_change_password
                        ? "Chưa đổi mật khẩu lần đầu"
                        : "Đã đổi mật khẩu"}
                          </small>
                        </>) : (<span className="status status-draft">
                          Chưa cấp
                        </span>)}
                    </td>
                    <td>
                      <span className={`status ${club.is_active
                    ? "status-passed"
                    : "status-draft"}`}>
                        {club.is_active
                    ? "Đang sử dụng"
                    : "Ngừng sử dụng"}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button type="button" className="btn" disabled={busy === club.id} onClick={() => provision(club.id)}>
                          {account
                    ? "Đặt lại 123456"
                    : "Cấp tài khoản"}
                        </button>

                        <button type="button" className={club.is_active
                    ? "btn fail"
                    : "btn pass"} disabled={busy === club.id} onClick={() => toggle(club)}>
                          {club.is_active
                    ? "Ngừng sử dụng"
                    : "Kích hoạt"}
                        </button>
                      </div>
                    </td>
                  </tr>);
        })}

              {!clubs.length && (<tr>
                  <td colSpan={5}>
                    <div className="empty">Chưa có CLB.</div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </>);
}

