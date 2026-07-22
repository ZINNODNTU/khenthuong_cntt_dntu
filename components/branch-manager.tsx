"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch, UnitAccountSummary, } from "@/lib/types";
type Credentials = {
    email: string;
    password: string;
    title: string;
};
export function BranchManager({ branches, accounts, canManage, }: {
    branches: Branch[];
    accounts: UnitAccountSummary[];
    canManage: boolean;
}) {
    const router = useRouter();
    const [message, setMessage] = useState("");
    const [busyCode, setBusyCode] = useState("");
    const [credentials, setCredentials] = useState<Credentials | null>(null);
    const accountByBranch = useMemo(() => new Map(accounts
        .filter((account) => account.branch_code)
        .map((account) => [account.branch_code as string, account] as const)), [accounts]);
    const missingAccounts = branches.filter((branch) => branch.is_active &&
        !accountByBranch.has(branch.code));
    async function addBranch(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");
        setCredentials(null);
        setBusyCode("new");
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/admin/branches", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                code: form.get("code"),
                name: form.get("name"),
            }),
        });
        const data = await response.json();
        if (response.ok) {
            setMessage("Đã thêm Chi đoàn và cấp tài khoản đăng nhập.");
            setCredentials({
                title: `Tài khoản Chi đoàn ${data.branch.code}`,
                email: data.account.email,
                password: data.account.password,
            });
            event.currentTarget.reset();
            router.refresh();
        }
        else {
            setMessage(data.error || "Không thể thêm Chi đoàn");
        }
        setBusyCode("");
    }
    async function provision(code?: string, allMissing = false) {
        setBusyCode(allMissing ? "all" : code || "");
        setMessage("");
        setCredentials(null);
        const response = await fetch("/api/admin/branches", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                code,
                allMissing,
            }),
        });
        const data = await response.json();
        if (response.ok) {
            const first = data.accounts?.[0];
            setMessage(allMissing
                ? `Đã cấp hoặc đặt lại ${data.accounts.length} tài khoản Chi đoàn.`
                : "Đã cấp lại tài khoản và mật khẩu mặc định.");
            if (!allMissing && first) {
                setCredentials({
                    title: `Tài khoản Chi đoàn ${code}`,
                    email: first.email,
                    password: first.password,
                });
            }
            router.refresh();
        }
        else {
            setMessage(data.error || "Không thể cấp tài khoản Chi đoàn");
        }
        setBusyCode("");
    }
    async function toggle(branch: Branch) {
        setMessage("");
        setCredentials(null);
        setBusyCode(branch.code);
        const response = await fetch("/api/admin/branches", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                code: branch.code,
                name: branch.name,
                isActive: !branch.is_active,
            }),
        });
        const data = await response.json();
        setMessage(response.ok
            ? `Đã ${branch.is_active ? "ngừng" : "kích hoạt"} Chi đoàn ${branch.code} và đồng bộ tài khoản.`
            : data.error || "Không thể cập nhật Chi đoàn");
        setBusyCode("");
        if (response.ok) {
            router.refresh();
        }
    }
    return (<>
      {canManage && (<form className="card section" onSubmit={addBranch}>
          <div className="section-title">
            <div>
              <h3>Thêm Chi đoàn và cấp tài khoản</h3>
              <p>
                Hệ thống tự tạo email theo mã Chi đoàn,
                mật khẩu mặc định 123456 và yêu cầu đổi mật
                khẩu ở lần đăng nhập đầu tiên.
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
              <label>Mã Chi đoàn *</label>
              <input name="code" required placeholder="Ví dụ: 26DTH1" pattern="[A-Za-z0-9_-]+"/>
            </div>

            <div className="field">
              <label>Tên hiển thị</label>
              <input name="name" placeholder="Mặc định giống mã Chi đoàn"/>
            </div>
          </div>

          <div className="actions" style={{ marginTop: 14 }}>
            <button className="btn primary" disabled={busyCode === "new"}>
              {busyCode === "new"
                ? "Đang tạo..."
                : "Thêm và cấp tài khoản"}
            </button>

            {missingAccounts.length > 0 && (<button type="button" className="btn" disabled={busyCode === "all"} onClick={() => provision(undefined, true)}>
                {busyCode === "all"
                    ? "Đang cấp..."
                    : `Cấp tài khoản cho ${missingAccounts.length} Chi đoàn còn thiếu`}
              </button>)}
          </div>
        </form>)}

      <div className="card panel" style={{ marginTop: canManage ? 16 : 0 }}>
        <div className="table-wrap">
          <table>
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
            return (<tr key={branch.code}>
                    <td>
                      <b>{branch.code}</b>
                    </td>
                    <td>{branch.name}</td>
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
                      <span className={`status ${branch.is_active
                    ? "status-passed"
                    : "status-draft"}`}>
                        {branch.is_active
                    ? "Đang sử dụng"
                    : "Ngừng sử dụng"}
                      </span>
                    </td>

                    {canManage && (<td>
                        <div className="actions">
                          <button type="button" className="btn" disabled={busyCode === branch.code} onClick={() => provision(branch.code)}>
                            {account
                        ? "Đặt lại 123456"
                        : "Cấp tài khoản"}
                          </button>

                          <button type="button" className={branch.is_active
                        ? "btn fail"
                        : "btn pass"} disabled={busyCode === branch.code} onClick={() => toggle(branch)}>
                            {branch.is_active
                        ? "Ngừng sử dụng"
                        : "Kích hoạt"}
                          </button>
                        </div>
                      </td>)}
                  </tr>);
        })}
            </tbody>
          </table>
        </div>
      </div>
    </>);
}

