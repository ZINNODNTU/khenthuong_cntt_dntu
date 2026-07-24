import { requireRole } from "@/lib/auth";
import { checkStorageHealth, StorageGatewayError } from "@/lib/apps-script-storage";
import { StorageDiagnostics } from "@/components/storage-diagnostics";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireRole(["admin"]);

  let initial: { ok: boolean; message: string; code?: string; folderName?: string; version?: string };
  try {
    const health = await checkStorageHealth();
    initial = { ok: true, message: "Kho ảnh đang hoạt động bình thường.", folderName: health.rootFolderName, version: health.version };
  } catch (error) {
    console.error("[settings.storage]", error);
    initial = {
      ok: false,
      message: error instanceof Error ? error.message : "Không thể kiểm tra kho ảnh.",
      code: error instanceof StorageGatewayError ? error.code : "STORAGE_UNKNOWN_ERROR",
    };
  }

  return (
    <>
      <PageHeader
        eyebrow="THIẾT LẬP VẬN HÀNH"
        title="Cấu hình hệ thống"
        description="Kiểm tra quy tắc xét duyệt và trạng thái kho ảnh."
      />

      <div className="grid-2 mb-4">
        <section className="card card-body">
          <h3 className="font-semibold mb-3" style={{ fontSize: "var(--font-size-lg)" }}>Quy tắc xét duyệt</h3>
          <div className="field mb-3">
            <label className="field-label">Kết quả</label>
            <input className="input" disabled value="Đạt / Không đạt / Yêu cầu bổ sung" />
          </div>
          <div className="field">
            <label className="field-label">Điểm số</label>
            <input className="input" disabled value="Không sử dụng" />
          </div>
        </section>
        <section className="card card-body">
          <h3 className="font-semibold mb-3" style={{ fontSize: "var(--font-size-lg)" }}>Quy định hình ảnh</h3>
          <div className="field mb-3">
            <label className="field-label">Định dạng</label>
            <input className="input" disabled value="JPG, PNG, WebP" />
          </div>
          <div className="field">
            <label className="field-label">Ảnh chân dung</label>
            <input className="input" disabled value="Bắt buộc đối với hồ sơ cá nhân" />
          </div>
        </section>
      </div>

      <StorageDiagnostics initial={initial} />
    </>
  );
}
