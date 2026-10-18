export const dynamic = "force-dynamic";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { RegisterForm } from "@/components/register-form";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, GraduationCap, ShieldCheck } from "lucide-react";
import styles from "./register-page.module.css";

export default async function RegisterPage() {
  if (!env.publicSignupEnabled()) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.from("branches").select("code,name").eq("is_active", true).order("code");
  const branches = data || [];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.side}>
          <div className={styles.brand}>
            <span className={styles.logo}><BrandLogo size={45} priority /></span>
            <span><strong>KHOA CÔNG NGHỆ THÔNG TIN</strong><small>TRƯỜNG ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI</small></span>
          </div>
          <div className={styles.story}>
            <span className={styles.tag}>ĐĂNG KÝ TRỰC TUYẾN</span>
            <h1>Đăng ký tài khoản <em>sinh viên.</em></h1>
            <p>Sử dụng địa chỉ email DNTU để tạo tài khoản nộp hồ sơ khen thưởng.</p>
            <ul>
              <li><CheckCircle2 size={20} /> Xác nhận email trường để kích hoạt tài khoản</li>
              <li><CheckCircle2 size={20} /> Cung cấp đầy đủ thông tin cá nhân</li>
              <li><CheckCircle2 size={20} /> Truy cập nộp và theo dõi hồ sơ xét thưởng</li>
            </ul>
          </div>
          <p className={styles.sideBottom}>DNTU · Xét khen thưởng Đoàn – Hội Khoa CNTT</p>
        </section>
        <section className={styles.content}>
          <div className={styles.top}><Link href="/login"><ArrowLeft size={17} /> Quay về đăng nhập</Link><span><ShieldCheck size={16} /> Xác thực email .edu.vn</span></div>
          <div className={styles.formContainer}>
            <span className={styles.eyebrow}>KHOA CNTT · DNTU</span>
            <h2>Đăng ký tài khoản</h2>
            <p>Điền đầy đủ thông tin bên dưới. Chỉ email sinh viên <strong>MSSV@dntu.edu.vn</strong> được chấp nhận.</p>
            <RegisterForm branches={branches} senderAddress={env.authEmailSenderAddress()} />
          </div>
          <div className={styles.bottom}><ShieldCheck size={15} /> Dữ liệu tài khoản được bảo vệ và chỉ sử dụng cho nghiệp vụ xét thưởng.</div>
        </section>
      </div>
    </main>
  );
}
