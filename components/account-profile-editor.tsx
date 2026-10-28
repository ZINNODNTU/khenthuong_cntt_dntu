"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Pencil, Save, X } from "lucide-react";
import styles from "@/app/(dashboard)/account/profile/profile.module.css";

type Details = { fullName: string; phone: string; birthDate: string; branchCode: string };

export function AccountProfileEditor({ initial, branches }: {
  initial: Details;
  branches: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Details>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const change = (field: keyof Details, value: string) => {
    setValues(current => ({ ...current, [field]: value }));
    setError(""); setSuccess("");
  };
  function cancel() {
    setValues(initial); setEditing(false); setError(""); setSuccess("");
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Không thể cập nhật thông tin.");
      setSuccess("Thông tin cá nhân đã được cập nhật.");
      setEditing(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể kết nối máy chủ.");
    } finally { setSaving(false); }
  }
  return (
    <div className={styles.editSection} id="edit-personal-info">
      <div className={styles.editHeading}>
        <div><strong>Thông tin có thể điều chỉnh</strong><p>Bạn được sửa họ tên, ngày sinh, số điện thoại và Chi đoàn. MSSV và email đăng nhập luôn cố định.</p></div>
        {!editing && <button type="button" className={styles.editButton} onClick={() => { setEditing(true); setError(""); setSuccess(""); }}><Pencil size={16} /> Chỉnh sửa thông tin</button>}
      </div>
      {success && <p className={styles.successNote} role="status"><CheckCircle2 size={16} /> {success}</p>}
      {editing && <form className={styles.editForm} onSubmit={save} aria-label="Chỉnh sửa thông tin cá nhân">
        {error && <div className={styles.errorNote} role="alert">{error}</div>}
        <div className={styles.editGrid}>
          <div><label htmlFor="account-full-name">Họ và tên <span>*</span></label>
            <input id="account-full-name" name="fullName" value={values.fullName} onChange={event => change("fullName", event.target.value)} className="input" minLength={2} maxLength={150} required disabled={saving} autoComplete="name" /></div>
          <div><label htmlFor="account-birth-date">Ngày sinh <span>*</span></label>
            <input id="account-birth-date" name="birthDate" value={values.birthDate} onChange={event => change("birthDate", event.target.value)} type="date" min="1900-01-01" className="input" required disabled={saving} /></div>
          <div><label htmlFor="account-phone">Số điện thoại <span>*</span></label>
            <input id="account-phone" name="phone" value={values.phone} onChange={event => change("phone", event.target.value)} type="tel" className="input" placeholder="09xxxxxxxx" pattern="(?:0[0-9]{9}|\\+84[0-9]{9})" required disabled={saving} autoComplete="tel" /></div>
          <div><label htmlFor="account-branch">Chi đoàn <span>*</span></label>
            <select id="account-branch" name="branchCode" className="select" value={values.branchCode} onChange={event => change("branchCode", event.target.value)} required disabled={saving || !branches.length}>
              <option value="" disabled>Chọn Chi đoàn</option>
              {values.branchCode && !branches.some(branch => branch.code === values.branchCode) && <option value={values.branchCode} disabled>{values.branchCode} (không còn hoạt động)</option>}
              {branches.map(branch => <option key={branch.code} value={branch.code}>{branch.code}{branch.name !== branch.code ? ` — ${branch.name}` : ""}</option>)}
            </select></div>
        </div>
        <p className={styles.editHelp}>Chi đoàn được lấy trực tiếp từ danh mục Quản lý Chi đoàn. Nếu hồ sơ xét thưởng còn đang xử lý, việc thay đổi Chi đoàn sẽ được hạn chế để tránh sai lệch dữ liệu.</p>
        <div className={styles.editActions}>
          <button className={styles.cancelButton} type="button" onClick={cancel} disabled={saving}><X size={16} /> Hủy</button>
          <button className={styles.saveButton} type="submit" disabled={saving || !branches.length}>{saving ? <><Loader2 size={17} className={styles.spinner} /> Đang lưu...</> : <><Save size={17} /> Lưu thay đổi</>}</button>
        </div>
      </form>}
    </div>
  );
}
