import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export default function ConfigurationPage() {
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="card" style={{ padding: "var(--space-8)" }}>
          <div className="login-header">
            <div className="login-logo">
              <BrandLogo size={56} priority />
            </div>
            <h1>Hệ thống đang được cấu hình</h1>
            <p>Dịch vụ chưa sẵn sàng. Vui lòng liên hệ quản trị kỹ thuật để hoàn tất thiết lập vận hành.</p>
          </div>

          <div className="notice notice-error" style={{ marginBottom: "var(--space-4)" }}>
            <b>Mã lỗi: SYSTEM_NOT_CONFIGURED</b>
            <div style={{ marginTop: 4 }}>Vui lòng thử lại sau khi quản trị viên hoàn tất cấu hình.</div>
          </div>

          <a href="/">
            <Button variant="primary" style={{ width: "100%" }}>Kiểm tra lại</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
