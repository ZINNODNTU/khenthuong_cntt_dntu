import { expect, test } from "@playwright/test";

test("Website nhận diện khen thưởng Đoàn – Hội Khoa CNTT", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle(/Xét khen thưởng Đoàn – Hội Khoa Công nghệ thông tin/);
  await expect(page.getByRole("heading", { name: /Xét khen thưởng Đoàn – Hội Khoa CNTT/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
  await expect(page.getByText("QUY TRÌNH THỰC HIỆN")).toHaveCount(0);
});

test("Trang đăng ký không giới thiệu xét tập thể", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Đăng ký tài khoản", exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Bộ tiêu chí tập thể");
});


test("Trang đăng nhập có quên mật khẩu và luồng yêu cầu email", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Quên mật khẩu?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole("heading", { name: "Quên mật khẩu?" })).toBeVisible();
  await page.getByLabel("MSSV hoặc email đăng ký").fill("khonghople@");
  await page.getByRole("button", { name: /Gửi liên kết khôi phục/ }).click();
  await expect(page.getByText("Vui lòng nhập MSSV hoặc địa chỉ email hợp lệ.")).toBeVisible();
});

test("Không báo đã gửi khi Supabase trả lỗi SMTP", async ({ page }) => {
  await page.route("**/api/auth/email", route =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify({ code: "EMAIL_PROVIDER_UNAVAILABLE", error: "Error sending recovery email" }),
    }),
  );
  await page.goto("/forgot-password");
  await page.getByLabel("MSSV hoặc email đăng ký").fill("123456789@dntu.edu.vn");
  await page.getByRole("button", { name: /Gửi liên kết khôi phục/ }).click();
  await expect(page.getByText(/Dịch vụ gửi email chưa khả dụng/)).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("Phản hồi thành công không khẳng định email đã phát tới hộp thư", async ({ page }) => {
  await page.route("**/api/auth/email", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: "{}",
    }),
  );
  await page.goto("/forgot-password");
  await page.getByLabel("MSSV hoặc email đăng ký").fill("123456789@dntu.edu.vn");
  await page.getByRole("button", { name: /Gửi liên kết khôi phục/ }).click();
  await expect(page.getByRole("status")).toContainText("Đã tiếp nhận yêu cầu");
  await expect(page.getByRole("status")).toContainText("Nếu địa chỉ email thuộc tài khoản đã đăng ký");
});

test("Callback quên mật khẩu không mở biểu mẫu khi thiếu phiên hợp lệ", async ({ page }) => {
  await page.goto("/auth/finish?mode=recovery");
  await expect(page.getByRole("heading", { name: "Liên kết không hợp lệ hoặc đã hết hạn" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Yêu cầu liên kết mới/ })).toHaveAttribute("href", "/forgot-password");
});

test("Trang đặt lại mật khẩu không mở cho khách chưa xác thực", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/forgot-password\?reason=expired/);
});

test("Các trang nghiệp vụ vẫn yêu cầu xác thực", async ({ page }) => {
  const res = await page.goto("/applications/new");
  expect([307, 200].includes(res?.status() || 0)).toBe(true);
  await expect(page).toHaveURL(/(?:\/login|\/?\?error=session)/);
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
});
