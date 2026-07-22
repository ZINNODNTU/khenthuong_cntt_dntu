import { BrandLogo } from "@/components/brand-logo";
export default function Loading() {
    return (<div className="system-loading" role="status" aria-live="polite">
      <BrandLogo size={72}/>
      <div className="system-loading-spinner"/>
      <strong>Đang tải hệ thống...</strong>
    </div>);
}

