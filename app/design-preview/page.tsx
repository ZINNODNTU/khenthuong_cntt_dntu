"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Bell, Check, ChevronRight, FileCheck2, Medal, Moon, Search, Sparkles, Star, Sun, TrendingUp, Trophy, Users, X } from "lucide-react";
import { MotionProvider } from "@/components/motion-provider";
import { FadeUp, GlowCard } from "@/components/ui/motion";
import "./design-preview.css";

const leaders = [["Nguyễn Minh Anh", "Chi đoàn 21DTH1", "980", "MA"], ["Trần Quốc Huy", "CLB Lập trình", "945", "QH"], ["Lê Hoàng Yến", "Chi đoàn 22DTH2", "910", "HY"], ["Phạm Gia Bảo", "Chi đoàn 21DTH3", "875", "GB"]];
const steps = [["Thông tin hồ sơ", "Đã hoàn tất", "done"], ["Minh chứng", "12 tệp đã tải lên", "done"], ["Xét duyệt cấp Khoa", "Đang xử lý", "active"], ["Công bố kết quả", "Dự kiến 28/07", ""]];
const nav = [["Tổng quan", "award-dashboard"], ["Xếp hạng", "leaderboard"], ["Chứng nhận", "certificate"]];

function LivingPage() {
  const [dark, setDark] = useState(true);
  const [activeNav, setActiveNav] = useState("award-dashboard");
  const [panel, setPanel] = useState<"search" | "notifications" | null>(null);
  return <main className={`award-preview ${dark ? "is-dark" : "is-light"}`} data-motion-ready="true">
    <div className="award-gradient" aria-hidden="true" /><div className="award-orb orb-one"/><div className="award-orb orb-two"/>
    <header className="award-header">
      <a className="award-brand" href="#award-dashboard"><span><Star size={21} fill="currentColor"/></span><p><strong>DNTU Awards</strong><small>University Commendation</small></p></a>
      <nav aria-label="Điều hướng trang">
        {nav.map(([label, id]) => <a key={id} href={`#${id}`} className={activeNav === id ? "active" : ""} onMouseEnter={() => setActiveNav(id)} onFocus={() => setActiveNav(id)} data-testid={`nav-${id}`}>{activeNav === id && <motion.i layoutId="nav-indicator"/>}{label}</a>)}
      </nav>
      <div className="award-actions">
        <button id="preview-search" aria-label="Tìm kiếm" aria-expanded={panel === "search"} onClick={() => setPanel(panel === "search" ? null : "search")}><Search/></button>
        <button id="preview-notifications" aria-label="Thông báo" aria-expanded={panel === "notifications"} onClick={() => setPanel(panel === "notifications" ? null : "notifications")}><Bell/></button>
        <button id="preview-theme-toggle" className="theme-toggle" aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"} onClick={() => setDark(!dark)}><Sun/><i/><Moon/></button><span className="award-avatar">NH</span>
      </div>
    </header>
    <AnimatePresence>
      {panel && <motion.aside className="award-popover" role="dialog" aria-label={panel === "search" ? "Tìm kiếm" : "Thông báo"} initial={{ opacity: 0, y: -8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .98 }}>
        <button aria-label="Đóng" onClick={() => setPanel(null)}><X/></button><strong>{panel === "search" ? "Tìm kiếm thành tích" : "Thông báo mới"}</strong><p>{panel === "search" ? "Nhập mã hồ sơ, danh hiệu hoặc tên sinh viên." : "Hồ sơ #HS-2025-084 đang được Hội đồng xác minh."}</p>
      </motion.aside>}
    </AnimatePresence>
    <section className="award-content" id="award-dashboard" aria-labelledby="award-page-title">
      <div className="award-welcome"><div><FadeUp delay={.05}><span className="kicker"><Sparkles/> HỌC KỲ II · 2025–2026</span></FadeUp><FadeUp delay={.12}><h1 id="award-page-title">Vinh danh hành trình<br/><em>tạo nên khác biệt.</em></h1></FadeUp><FadeUp delay={.2}><p>Theo dõi thành tích, hồ sơ xét duyệt và những gương mặt nổi bật trong cộng đồng sinh viên DNTU.</p></FadeUp></div><motion.button data-testid="hero-cta" className="primary" whileHover={{ scale: 1.025 }} whileTap={{ scale: .98 }}>Nộp hồ sơ mới <ChevronRight/></motion.button></div>
      <div className="award-bento">
        <GlowCard className="overview" testId="bento-overview"><header><div><span>TỔNG QUAN THÀNH TÍCH</span><h2>Dấu ấn của bạn</h2></div><button>Năm học 2025–2026</button></header><div className="stat-row">{[[Trophy,"12","Danh hiệu","+3 năm nay","blue"],[Medal,"08","Chứng nhận","Top 5%","gold"],[TrendingUp,"980","Điểm thi đua","+12.4%","violet"]].map(([Icon,n,l,b,c])=><div key={String(l)}><i className={String(c)}><Icon/></i><p><strong>{String(n)}</strong><small>{String(l)}</small></p><b>{String(b)}</b></div>)}</div><div className="award-chart">{[42,56,49,68,76,92,82,100,91,112,108,128].map((h,i)=><motion.i key={i} initial={{height:0}} animate={{height:h}} transition={{delay:.3+i*.025}}/>)}<span>Tháng 1</span><span>Tháng 3</span><span>Tháng 6</span><span>Tháng 9</span><span>Tháng 12</span></div></GlowCard>
        <GlowCard className="medal-card" testId="bento-medal"><div className="medal-scene"><span className="clay-star one"><Star fill="currentColor"/></span><span className="clay-star two"><Star fill="currentColor"/></span><div className="ribbon"/><motion.div className="medal" animate={{y:[0,-5,0]}} transition={{duration:4,repeat:Infinity}}><Award/></motion.div></div><span className="kicker">THÀNH TỰU NỔI BẬT</span><h2>Sinh viên 5 tốt</h2><p>Cấp Trường · Năm học 2024–2025</p><button>Xem thành tích <ChevronRight/></button></GlowCard>
        <GlowCard className="leaderboard" testId="bento-leaderboard"><header><div><span>BẢNG XẾP HẠNG</span><h2 id="leaderboard">Gương mặt dẫn đầu</h2></div><b className="live"><i/> Trực tiếp</b></header><div className="leader-list">{leaders.map((l,i)=><div key={l[0]} className={i===0?"first":""}><strong className={`rank r${i+1}`}>{i+1}</strong><span className="person-avatar">{l[3]}</span><p><b>{l[0]}</b><small>{l[1]}</small></p><span className="score">{l[2]}<small>điểm</small></span></div>)}</div><button className="text-button">Xem toàn bộ bảng xếp hạng <ChevronRight/></button></GlowCard>
        <GlowCard className="progress-card" testId="bento-progress"><header><div><span>HỒ SƠ #HS-2025-084</span><h2>Tiến độ xét duyệt</h2></div><b className="review-badge">Đang xét duyệt</b></header><div className="progress-list">{steps.map((s,i)=><div key={s[0]} className={s[2]}><span>{s[2]==="done"?<Check/>:i+1}</span><p><b>{s[0]}</b><small>{s[1]}</small></p></div>)}</div><footer><FileCheck2/><p><b>Hồ sơ đã được tiếp nhận</b><small>Hội đồng đang xác minh minh chứng của bạn.</small></p></footer></GlowCard>
        <GlowCard className="certificate-card" testId="bento-certificate"><header><div><span>CHỨNG NHẬN SỐ</span><h2 id="certificate">Thành tích mới nhất</h2></div><button aria-label="Xem chi tiết chứng nhận"><ChevronRight/></button></header><div className="certificate"><div className="cert-logo"><Star fill="currentColor"/></div><small>TRƯỜNG ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI</small><h3>GIẤY CHỨNG NHẬN</h3><p>Chứng nhận sinh viên</p><strong>NGUYỄN MINH ANH</strong><p>Đạt danh hiệu <b>Thanh niên tiên tiến làm theo lời Bác</b></p><footer><span>TM. BAN THƯỜNG VỤ</span><i><Award/></i><span>Ngày 18 tháng 05 năm 2026</span></footer></div><div className="cert-meta"><span><FileCheck2/> Đã xác thực Blockchain</span><button>Tải chứng nhận</button></div></GlowCard>
        <GlowCard className="community" testId="bento-community"><span><Users/></span><p><strong>2,480+</strong><small>Sinh viên tham gia</small></p><i>+18%</i></GlowCard>
      </div>
    </section>
  </main>;
}
export default function DesignPreviewPage(){return <MotionProvider><LivingPage/></MotionProvider>}
