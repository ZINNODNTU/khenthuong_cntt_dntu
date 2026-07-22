import { requireRole } from "@/lib/auth";
import { checkStorageHealth, StorageGatewayError } from "@/lib/apps-script-storage";
import { StorageDiagnostics } from "@/components/storage-diagnostics";
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
    await requireRole(["admin"]);
    let initial: {
        ok: boolean;
        message: string;
        code?: string;
        folderName?: string;
        version?: string;
    };
    try {
        const health = await checkStorageHealth();
        initial = {
            ok: true,
            message: "Kho ảnh đang hoạt động bình thường.",
            folderName: health.rootFolderName,
            version: health.version,
        };
    }
    catch (error) {
        console.error("[settings.storage]", error);
        initial = {
            ok: false,
            message: error instanceof Error ? error.message : "Không thể kiểm tra kho ảnh.",
            code: error instanceof StorageGatewayError ? error.code : "STORAGE_UNKNOWN_ERROR",
        };
    }
    return (<>
      <div className="page-head">
        <div>
          <div className="eyebrow">THIẾT LẬP VẬN HÀNH</div>
          <h1>Cấu hình hệ thống</h1>
          <p>Kiểm tra quy tắc xét duyệt và trạng thái kho ảnh.</p>
        </div>
      </div>
      <div className="grid-2">
        <section className="card panel">
          <h3>Quy tắc xét duyệt</h3>
          <div className="field"><label>Kết quả</label><input disabled value="Đạt / Không đạt / Yêu cầu bổ sung"/></div>
          <div className="field" style={{ marginTop: 10 }}><label>Điểm số</label><input disabled value="Không sử dụng"/></div>
        </section>
        <section className="card panel">
          <h3>Quy định hình ảnh</h3>
          <div className="field"><label>Định dạng</label><input disabled value="JPG, PNG, WebP"/></div>
          <div className="field" style={{ marginTop: 10 }}><label>Ảnh chân dung</label><input disabled value="Bắt buộc đối với hồ sơ cá nhân"/></div>
        </section>
      </div>
      <StorageDiagnostics initial={initial}/>
    </>);
}

