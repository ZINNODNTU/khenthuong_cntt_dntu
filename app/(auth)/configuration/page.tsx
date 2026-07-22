import { BrandLogo } from "@/components/brand-logo";
export default function ConfigurationPage() {
    return (<div className="login-shell">
      <section className="login-hero">
        <BrandLogo size={92} className="login-brand-logo" priority/>
        <h1>Hệ thống đang được cấu hình.</h1>
        <p>
          Dịch vụ chưa sẵn sàng. Vui lòng liên hệ quản trị kỹ thuật để hoàn tất
          thiết lập vận hành.
        </p>
      </section>
      <section className="login-panel">
        <div className="card login-card">
          <div className="login-card-brand">
            <BrandLogo size={58}/>
            <div>
              <strong>TRẠNG THÁI HỆ THỐNG</strong>
              <span>Mã lỗi: SYSTEM_NOT_CONFIGURED</span>
            </div>
          </div>
          <h2>Chưa thể truy cập</h2>
          <p>Một số cấu hình vận hành còn thiếu hoặc chưa hợp lệ.</p>
          <div className="notice error">
            Vui lòng thử lại sau khi quản trị viên hoàn tất cấu hình.
          </div>
          <a className="btn primary auth-submit" href="/">Kiểm tra lại</a>
        </div>
      </section>
    </div>);
}

