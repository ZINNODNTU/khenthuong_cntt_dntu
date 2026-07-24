"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IMAGE_MIME_TYPES } from "@/lib/constants";
import type { Application } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea, Input, Select, Field } from "@/components/ui/input";

export function SupplementForm({ app }: { app: Application }) {
  const router = useRouter();
  const [target, setTarget] = useState(`application:${app.id}:main`);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const hasPortrait = (app.evidences || []).some((item) => item.parent_type === "application" && item.category === "portrait");

  function chooseFiles(list: FileList | null) {
    const accepted = [...(list || [])].filter((file) => (IMAGE_MIME_TYPES as readonly string[]).includes(file.type));
    if (accepted.length !== (list?.length || 0)) setError("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
    setFiles(accepted);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData(event.currentTarget);
      const update = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ achievements: form.get("achievements"), summary: form.get("summary"), resubmit: false }),
      });
      const updateResult = await update.json();
      if (!update.ok) throw new Error(updateResult.error || "Không thể cập nhật hồ sơ");

      const [parentType, parentId, category] = target.split(":");
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);
        body.set("applicationId", app.id);
        body.set("applicationCode", app.code);
        body.set("parentType", parentType);
        body.set("parentId", parentId);
        body.set("category", category);
        const r = await fetch("/api/evidence/upload", { method: "POST", body });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || `Không thể tải ảnh ${file.name}`);
      }

      const resubmit = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ achievements: form.get("achievements"), summary: form.get("summary"), resubmit: true }),
      });
      const result = await resubmit.json();
      if (!resubmit.ok) throw new Error(result.error || "Không thể nộp lại hồ sơ");

      setSuccess("Đã bổ sung và nộp lại hồ sơ cho hội đồng.");
      router.push(`/applications/${app.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-layout" onSubmit={submit}>
      <div className="form-main">
        {error && <div className="notice notice-error">{error}</div>}
        {success && <div className="notice notice-success">{success}</div>}

        <section className="card form-section">
          <h3>1. Cập nhật nội dung</h3>
          <p>Chỉnh phần thành tích và bản tóm tắt theo nhận xét của hội đồng.</p>
          <div className="field mb-4">
            <label className="field-label">Thành tích nổi bật</label>
            <textarea className="textarea" name="achievements" defaultValue={app.achievements} required minLength={20} />
          </div>
          <div className="field">
            <label className="field-label">Bản tóm tắt</label>
            <textarea className="textarea" name="summary" defaultValue={app.summary || ""} />
          </div>
        </section>

        <section className="card form-section">
          <h3>2. Bổ sung ảnh minh chứng</h3>
          <p>Chọn đúng nội dung cần gắn ảnh.</p>
          <div className="form-grid">
            <div className="field span-2">
              <label className="field-label">Nội dung nhận minh chứng</label>
              <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
                {app.application_type === "individual" && !hasPortrait && (
                  <option value={`application:${app.id}:portrait`}>Ảnh chân dung</option>
                )}
                <option value={`application:${app.id}:main`}>Báo cáo thành tích tổng hợp</option>
                {(app.activities || []).map((a) => (
                  <option key={a.id} value={`activity:${a.id}:${a.level}`}>Hoạt động: {a.name}</option>
                ))}
                {(app.prior_awards || []).map((a) => (
                  <option key={a.id} value={`award:${a.id}:award`}>Khen thưởng: {a.title}</option>
                ))}
              </select>
            </div>
            <div className="field span-2">
              <label className="field-label">Ảnh bổ sung</label>
              <div className="upload-zone">
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => chooseFiles(e.target.files)} />
                <div className="upload-note">Đã chọn {files.length} ảnh. Chỉ JPG, PNG, WebP.</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside className="form-sidebar">
        <div className="card card-body">
          <h4 className="font-semibold mb-1" style={{ fontSize: "var(--font-size-base)" }}>Nhận xét hội đồng</h4>
          <p className="text-sm text-secondary mb-4">{app.review_comment || "Chưa có nhận xét."}</p>
          <Button variant="primary" loading={busy}>
            {busy ? "Đang nộp lại..." : "Bổ sung và nộp lại"}
          </Button>
        </div>
      </aside>
    </form>
  );
}
