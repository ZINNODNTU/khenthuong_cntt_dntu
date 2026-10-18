# Đánh giá hiệu năng LOCAL — CNTT DNTU — 18/10/2026

## Phạm vi và phương pháp
- Đo trên máy Windows của workspace `D:\khenthuong_cntt_dntu` qua @cntt; CPU Intel Core i5-1035G1 (8 logical), RAM 15,8 GiB, Node.js v24.16.0, Next.js v16.3.8.
- Development tại `http://127.0.0.1:3000`; production build chạy riêng trên `http://127.0.0.1:3001`.
- Script `scripts/benchmark-local.mjs`: GET không đăng nhập, thời gian nhận byte đầu (TTFB), thời gian tải toàn bộ body, p50/p95, mức đồng thời 1/5/10. Mỗi mức 20–35 request sau warmup. Không giả lập ghi dữ liệu, không stress Supabase/Drive.
- Script `scripts/benchmark-browser-local.mjs`: Chromium headless, desktop 1440×900 và mobile 390×844; 4 lượt điều hướng mỗi trang; Navigation Timing, FCP, LCP, CLS.
- Script `scripts/benchmark-mobile-throttled.mjs`: mobile 390×844, Chromium CDP 150 ms RTT, tải xuống 200 kB/s (~1,6 Mb/s), tải lên 90 kB/s, CPU throttling 4x, mỗi trang 3 lượt; đây là mô phỏng, không phải thiết bị hay 4G thật.
- Script `scripts/diagnose-layout-shift-local.mjs`: truy vết LayoutShift nguồn đến `div.formContent` trên login production.
- Thực hiện thêm 12 yêu cầu đọc trực tiếp endpoint Supabase `public.branches` qua publishable key, **không in key**. Tất cả HTTP 200, trả 19 chi đoàn.

## HTTP response time (milliseconds), sequential, measured full response
| Route | Dev p50 | Dev p95 | Production p50 | Production p95 | Production TTFB p95 |
|---|---:|---:|---:|---:|---:|
| /login | 60.8 | 68.5 | 5.7 | 9.0 | 7.8 |
| /register | 226.5 | 516.3 | 140.1 | 406.9 | 13.7 |
| /design-preview | 71.8 | 82.1 | 4.6 | 5.0 | 4.4 |
| /dashboard (307) | 5.4 | 6.4 | 2.5 | 3.1 | 3.0 |

Production response body trung bình: login 22.034 bytes, register 28.879 bytes, design-preview 27.293 bytes.

## Đồng thời — GET local, 35 requests per workload
| Server/Route | Concurrency | OK | p50 ms | p95 ms | Throughput, requests/s |
|---|---:|---:|---:|---:|---:|
| Dev /login | 5 | 35/35 | 322.4 | 343.1 | 15.74 |
| Dev /login | 10 | 35/35 | 612.4 | 707.3 | 15.37 |
| Production /login | 5 | 35/35 | 19.0 | 24.9 | 250.04 |
| Production /login | 10 | 35/35 | 29.8 | 32.3 | 338.51 |
| Dev /design-preview | 5 | 35/35 | 363.5 | 383.2 | 13.81 |
| Production /design-preview | 5 | 35/35 | 15.9 | 18.3 | 312.00 |

**Lưu ý:** Throughput ở đây là số request hoàn tất chia cho thời gian batch rất ngắn, KHÔNG phải thông lượng bền vững hay mô phỏng sinh viên đăng nhập/nộp hồ sơ. Dev chịu chi phí xử lý riêng; không lấy số dev làm dự báo production.

## Chromium UI — production, median across 4 visits
| Viewport | Route | Browser TTFB ms | DOM Content Loaded ms | FCP ms | LCP ms |
|---|---|---:|---:|---:|---:|
| desktop | /login | 4.8 | 73.3 | 282 | 282 |
| desktop | /register | 9.8 | 171.1 | 518 | 518 |
| desktop | /design-preview | 4.2 | 73.5 | 342 | 342 |
| mobile | /login | 4.7 | 74.6 | 192 | 192 |
| mobile | /register | 8.7 | 289.7 | 506 | 506 |
| mobile | /design-preview | 4.3 | 73.6 | 276 | 276 |

## Mobile network/CPU emulation — production, median across 3 visits
| Route | FCP ms | LCP ms | CLS |
|---|---:|---:|---:|
| /login | 1,088 | 1,088 | 0.20 |
| /register | 1,256 | 1,256 | 0 |
| /design-preview | 1,368 | 1,368 | 0 |

Thử no-throttle 390 px thấy login CLS=0.15622 (4/4 lần), desktop login khoảng 0.0308; điểm dịch chuyển là `.formContent`. Chạy chẩn đoán 3 lần mobile production đều CLS=0.15622 tại ~283–294 ms, nguyên tố `DIV.formContent` thay đổi từ bounding box khoảng (x=20,y=239,width=349,height=383) tới (x=0,y=80,width=390,height=701). Cần kiểm tra nguyên nhân của CSS/streaming/hydration/Suspense để ổn định chiều cao/khung trước khi interactive. Đừng mặc định nguyên nhân do animation mà chưa xác minh.

## Bottleneck đăng ký — Supabase
- Trang `app/(auth)/register/page.tsx` gọi `supabase.from('branches').select('code,name').eq('is_active',true).order('code')` từ server **trên mỗi lượt mở**, và có `dynamic = 'force-dynamic'`.
- Trong thử tuần tự 12 truy vấn đọc tới Supabase, direct call p50=144 ms, p95=1200 ms (12/12 HTTP 200). Độ trễ và dao động mạng tới DB gây ảnh hưởng rõ cho thời gian nhận toàn bộ response của /register (production p95=407 ms trong batch; có thể cao hơn trong thời điểm khác).
- Đề xuất cache dữ liệu danh sách chi đoàn trong ngắn hạn (ví dụ 60–300 giây) hoặc preload theo cơ chế an toàn; API đăng ký **vẫn phải xác thực chi đoàn còn hoạt động tại thời điểm ghi**.
- Production /register p95 TTFB chỉ 13.7 ms, nhưng total p95 406.9 ms, phản ánh nội dung cuối cần chờ công việc asynchronous sau byte đầu.

## Đánh giá và giới hạn
**Tốt:** public login/preview trên production nhanh, 0 lỗi cho các HTTP benchmark; giao diện LCP thường 0.2–0.5 giây local và ~1.1–1.4 giây khi mô phỏng máy/mạng chậm.

**Cần cải thiện:** (1) CSS/layout stability trên màn login mobile CLS >0.1; (2) giảm phụ thuộc request mạng Supabase của trang register; (3) Node 24 đang khác yêu cầu Node 22; (4) cần instrumentation cho API upload và backend.

**Chưa đo được:** login có xác thực và session thật, thao tác CRUD hồ sơ, upload/download PDF/ảnh đa minh chứng theo người dùng thật, xét duyệt thực tế, dọn Drive, số sinh viên đồng thời và độ trễ chạy ở Vercel theo mạng Việt Nam. Local chưa có `SUPABASE_SECRET_KEY`. Không thể suy ra năng lực phục vụ 300+ sinh viên từ GET localhost.

## Nguồn số liệu
- `ui-audit-results/performance/http-development.json`
- `ui-audit-results/performance/http-production.json`
- `ui-audit-results/performance/browser-development.json`
- `ui-audit-results/performance/browser-production.json`
- `ui-audit-results/performance/browser-production-throttled.json`

Kết luận: bản production public có tốc độ phản hồi tốt ở local. Hai vấn đề ưu tiên trước nghiệm thu UX là load đăng ký phụ thuộc Supabase và CLS mobile khi đăng nhập. Core workflow authenticated **chưa được benchmark**, không đánh dấu go-live chỉ dựa trên các số này.
