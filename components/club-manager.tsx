"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Club } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function ClubManager({ clubs }: { clubs: Club[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy("new");
    setMessage("");
    try {
      const response = await fetch("/api/admin/clubs", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: data.get("code"), name: data.get("name") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể thêm câu lạc bộ.");
      setMessage("Đã bổ sung câu lạc bộ vào danh mục tham chiếu.");
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối máy chủ.");
    } finally { setBusy(""); }
  }

  async function toggle(club: Club) {
    if (busy) return;
    setBusy(club.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/clubs", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: club.id, code: club.code, name: club.name, isActive: !club.is_active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể cập nhật câu lạc bộ.");
      setMessage("Đã cập nhật trạng thái câu lạc bộ.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối máy chủ.");
    } finally { setBusy(""); }
  }

  return (
    <>
      <form className="card card-body mb-4" onSubmit={create}>
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Danh mục câu lạc bộ</h3>
          <p className="text-sm text-secondary">Chỉ lưu thông tin tổ chức để đối chiếu vai trò cá nhân ở tiêu chí C5. Không tạo tài khoản hoặc hồ sơ xét thưởng tập thể.</p>
        </div>
        {message && <div role="status" className={`notice ${message.startsWith("Đã") ? "notice-success" : "notice-error"} mb-4`}>{message}</div>}
        <div className="form-grid">
          <div className="field">
            <label className="field-label" htmlFor="club-code">Mã CLB *</label>
            <input id="club-code" className="input" name="code" pattern="[A-Za-z0-9_-]+" required placeholder="Ví dụ: CLB-AI" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="club-name">Tên câu lạc bộ *</label>
            <input id="club-name" className="input" name="name" required placeholder="Ví dụ: Câu lạc bộ công nghệ" />
          </div>
        </div>
        <div className="mt-4"><Button variant="primary" loading={busy === "new"}>Thêm câu lạc bộ</Button></div>
      </form>
      <div className="card card-body">
        <div className="table-wrap table-responsive-card">
          <table className="table">
            <thead><tr><th>Mã</th><th>Câu lạc bộ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {clubs.map(club => (
                <tr key={club.id}>
                  <td data-label="Mã"><b>{club.code}</b></td>
                  <td data-label="Câu lạc bộ">{club.name}</td>
                  <td data-label="Trạng thái"><span className={`badge ${club.is_active ? "badge-green" : "badge-gray"}`}>{club.is_active ? "Đang sử dụng" : "Ngừng sử dụng"}</span></td>
                  <td data-label="Thao tác"><Button type="button" size="sm" variant={club.is_active ? "outline" : "primary"} loading={busy === club.id} disabled={!!busy} onClick={() => toggle(club)}>{club.is_active ? "Ngừng sử dụng" : "Kích hoạt"}</Button></td>
                </tr>
              ))}
              {!clubs.length && <tr><td colSpan={4}><p className="text-sm text-secondary">Chưa có câu lạc bộ nào.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
