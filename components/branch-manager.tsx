"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function BranchManager({ branches, canManage }: { branches: Branch[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function addBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy("new");
    setMessage("");
    try {
      const response = await fetch("/api/admin/branches", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: data.get("code"), name: data.get("name") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể thêm Chi đoàn.");
      setMessage("Đã bổ sung Chi đoàn vào danh mục dành cho sinh viên.");
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối máy chủ.");
    } finally { setBusy(""); }
  }

  async function toggle(branch: Branch) {
    if (busy) return;
    setBusy(branch.code);
    setMessage("");
    try {
      const response = await fetch("/api/admin/branches", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: branch.code, name: branch.name, isActive: !branch.is_active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể cập nhật Chi đoàn.");
      setMessage("Đã cập nhật trạng thái danh mục Chi đoàn.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối máy chủ.");
    } finally { setBusy(""); }
  }

  return (
    <>
      {canManage && (
        <form className="card card-body mb-4" onSubmit={addBranch}>
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Danh mục Chi đoàn sinh viên</h3>
            <p className="text-sm text-secondary">Thêm đơn vị để sinh viên chọn khi đăng ký và nộp hồ sơ cá nhân. Không tạo tài khoản nộp hồ sơ tập thể.</p>
          </div>
          {message && <div role="status" className={`notice ${message.startsWith("Đã") ? "notice-success" : "notice-error"} mb-4`}>{message}</div>}
          <div className="form-grid">
            <div className="field">
              <label className="field-label" htmlFor="branch-code">Mã Chi đoàn *</label>
              <input id="branch-code" className="input" name="code" required pattern="[A-Za-z0-9_-]+" placeholder="Ví dụ: 26DTH1" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="branch-name">Tên hiển thị</label>
              <input id="branch-name" className="input" name="name" placeholder="Mặc định là mã Chi đoàn" />
            </div>
          </div>
          <div className="mt-4"><Button variant="primary" loading={busy === "new"}>Thêm Chi đoàn</Button></div>
        </form>
      )}
      <div className="card card-body">
        <div className="table-wrap table-responsive-card">
          <table className="table">
            <thead><tr><th>Mã</th><th>Chi đoàn</th><th>Trạng thái</th>{canManage && <th>Thao tác</th>}</tr></thead>
            <tbody>
              {branches.map(branch => (
                <tr key={branch.code}>
                  <td data-label="Mã"><b>{branch.code}</b></td>
                  <td data-label="Chi đoàn">{branch.name}</td>
                  <td data-label="Trạng thái"><span className={`badge ${branch.is_active ? "badge-green" : "badge-gray"}`}>{branch.is_active ? "Đang sử dụng" : "Ngừng sử dụng"}</span></td>
                  {canManage && <td data-label="Thao tác"><Button type="button" size="sm" variant={branch.is_active ? "outline" : "primary"} disabled={!!busy} loading={busy === branch.code} onClick={() => toggle(branch)}>{branch.is_active ? "Ngừng sử dụng" : "Kích hoạt"}</Button></td>}
                </tr>
              ))}
              {!branches.length && <tr><td colSpan={canManage ? 4 : 3}><p className="text-sm text-secondary">Chưa có Chi đoàn nào.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
