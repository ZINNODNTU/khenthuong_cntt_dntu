"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import type { Branch } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function BranchManager({ branches, canManage }: { branches: Branch[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function mutate(method: "POST" | "PATCH" | "DELETE", payload: unknown) {
    const response = await fetch("/api/admin/branches", {
      method, headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(result.error || "Không thể cập nhật Chi đoàn.");
    router.refresh();
  }
  async function addBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canManage) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy("new"); setMessage("");
    try {
      await mutate("POST", {
        code: String(data.get("code") || "").trim().toUpperCase(),
        name: String(data.get("name") || "").trim() || undefined,
      });
      setMessage("Đã bổ sung Chi đoàn vào danh mục dành cho sinh viên.");
      form.reset();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Không thể kết nối máy chủ.");
    } finally { setBusy(""); }
  }
  function startEdit(branch: Branch) {
    if (busy) return;
    setEditing(branch.code);
    setEditCode(branch.code);
    setEditName(branch.name);
    setEditActive(branch.is_active);
    setMessage("");
  }
  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(editing); setMessage("");
    try {
      await mutate("PATCH", {
        code: editing, newCode: editCode.trim().toUpperCase(), name: editName.trim(),
        isActive: editActive,
      });
      setEditing(null);
      setMessage("Đã lưu thay đổi Chi đoàn.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Không thể lưu Chi đoàn.");
    } finally { setBusy(""); }
  }
  async function toggle(branch: Branch) {
    if (busy) return;
    setBusy(branch.code); setMessage("");
    try {
      await mutate("PATCH", { code: branch.code, name: branch.name, isActive: !branch.is_active });
      setMessage("Đã cập nhật trạng thái Chi đoàn.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Không thể cập nhật Chi đoàn.");
    } finally { setBusy(""); }
  }
  async function remove(branch: Branch) {
    if (busy || !canManage) return;
    if (!window.confirm(`Xóa vĩnh viễn Chi đoàn "${branch.code}"? Chỉ Chi đoàn chưa có tài khoản hoặc hồ sơ liên kết mới được xóa. Các Chi đoàn đã sử dụng cần chuyển sang Ngừng sử dụng.`)) return;
    setBusy(branch.code); setMessage("");
    try {
      await mutate("DELETE", { code: branch.code });
      setMessage(`Đã xóa Chi đoàn ${branch.code} khỏi danh mục.`);
      if (editing === branch.code) setEditing(null);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Không thể xóa Chi đoàn.");
    } finally { setBusy(""); }
  }
  return (
    <>
      {canManage && (
        <form className="card card-body mb-4" onSubmit={addBranch}>
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Danh mục Chi đoàn sinh viên</h3>
            <p className="text-sm text-secondary">Sinh viên chọn Chi đoàn từ danh mục này khi đăng ký hoặc cập nhật thông tin cá nhân. Có thể đổi tên, trạng thái hoặc xóa Chi đoàn chưa sử dụng.</p>
          </div>
          {message && <div role={message.startsWith("Đã") ? "status" : "alert"} className={`notice ${message.startsWith("Đã") ? "notice-success" : "notice-error"} mb-4`}>{message}</div>}
          <div className="form-grid">
            <div className="field"><label className="field-label" htmlFor="branch-code">Mã Chi đoàn *</label>
              <input id="branch-code" className="input" name="code" required pattern="[A-Za-z0-9_-]+" maxLength={30} placeholder="Ví dụ: 26DTH1" disabled={!!busy} /></div>
            <div className="field"><label className="field-label" htmlFor="branch-name">Tên hiển thị</label>
              <input id="branch-name" className="input" name="name" maxLength={100} placeholder="Mặc định là mã Chi đoàn" disabled={!!busy} /></div>
          </div>
          <div className="mt-4"><Button variant="primary" disabled={!!busy} loading={busy === "new"}>Thêm Chi đoàn</Button></div>
        </form>
      )}
      <section className="card card-body" aria-label="Danh sách Chi đoàn">
        <div className="mb-4"><h3 className="font-semibold text-lg">Danh sách Chi đoàn</h3>
          <p className="text-sm text-secondary">Mã Chi đoàn đã được sinh viên hoặc hồ sơ sử dụng sẽ không thể đổi/xóa để bảo toàn dữ liệu lịch sử.</p></div>
        <div className="table-wrap table-responsive-card">
          <table className="table">
            <thead><tr><th>Mã</th><th>Chi đoàn</th><th>Trạng thái</th>{canManage && <th>Thao tác</th>}</tr></thead>
            <tbody>
              {branches.map(branch => (
                <tr key={branch.code}>
                  <td data-label="Mã"><b>{branch.code}</b></td>
                  <td data-label="Chi đoàn">{branch.name}</td>
                  <td data-label="Trạng thái"><span className={`badge ${branch.is_active ? "badge-green" : "badge-gray"}`}>{branch.is_active ? "Đang sử dụng" : "Ngừng sử dụng"}</span></td>
                  {canManage && <td data-label="Thao tác">
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => startEdit(branch)}><Pencil size={14} /> Sửa</Button>
                      <Button type="button" size="sm" variant={branch.is_active ? "outline" : "primary"} disabled={!!busy} loading={busy === branch.code} onClick={() => toggle(branch)}>{branch.is_active ? "Ngừng sử dụng" : "Kích hoạt"}</Button>
                      <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => remove(branch)}><Trash2 size={14} /> Xóa</Button>
                    </div>
                  </td>}
                </tr>
              ))}
              {!branches.length && <tr><td colSpan={canManage ? 4 : 3}><p className="text-sm text-secondary">Chưa có Chi đoàn nào.</p></td></tr>}
            </tbody>
          </table>
        </div>
        {canManage && editing && <form className="card card-body mt-4" onSubmit={saveEdit} aria-label={`Sửa Chi đoàn ${editing}`}>
          <div className="mb-3" style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <h3 className="font-semibold">Chỉnh sửa Chi đoàn {editing}</h3>
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setEditing(null)} disabled={!!busy} aria-label="Đóng chỉnh sửa"><X size={17} /></button>
          </div>
          <div className="form-grid">
            <div className="field"><label className="field-label" htmlFor="branch-edit-code">Mã Chi đoàn *</label>
              <input className="input" id="branch-edit-code" value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase())} required maxLength={30} pattern="[A-Z0-9_-]+" disabled={!!busy} /></div>
            <div className="field"><label className="field-label" htmlFor="branch-edit-name">Tên hiển thị *</label>
              <input className="input" id="branch-edit-name" value={editName} onChange={e => setEditName(e.target.value)} required minLength={2} maxLength={100} disabled={!!busy} /></div>
          </div>
          <label className="mt-3" style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
            <input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} disabled={!!busy} /> Đang sử dụng
          </label>
          <div className="mt-4" style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            <Button variant="primary" type="submit" loading={!!busy} disabled={!!busy}>Lưu thay đổi</Button>
            <Button variant="outline" type="button" disabled={!!busy} onClick={() => setEditing(null)}>Hủy</Button>
          </div>
        </form>}
      </section>
    </>
  );
}
