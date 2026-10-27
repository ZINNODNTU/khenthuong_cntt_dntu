import { expect, test } from "@playwright/test";

test("Có thể mở trang gửi lại email xác nhận từ đăng nhập", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Gửi lại thư xác nhận" }).click();
  await expect(page).toHaveURL(/\/resend-confirmation$/);
  await expect(page.getByRole("heading", { name: "Gửi lại email xác nhận" })).toBeVisible();
});

test("Không gọi Supabase nếu email không đúng dạng MSSV", async ({ page }) => {
  let requests = 0;
  await page.route("**/auth/v1/resend*", route => {
    requests++;
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.goto("/resend-confirmation");
  await page.getByLabel("MSSV hoặc email sinh viên DNTU").fill("outside@gmail.com");
  await page.getByRole("button", { name: "Gửi lại thư xác nhận" }).click();
  await expect(page.locator('form [role="alert"]')).toContainText("MSSV@dntu.edu.vn");
  expect(requests).toBe(0);
});

test("Chỉ xác nhận tiếp nhận yêu cầu, không khẳng định thư đã tới Inbox", async ({ page }) => {
  let requests = 0;
  await page.route("**/auth/v1/resend*", route => {
    requests++;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: "{}",
    });
  });
  await page.goto("/resend-confirmation");
  await page.getByLabel("MSSV hoặc email sinh viên DNTU").fill("12345678");
  await page.getByRole("button", { name: "Gửi lại thư xác nhận" }).click();
  await expect(page.getByRole("status")).toContainText("Đã tiếp nhận yêu cầu");
  await expect(page.getByRole("status")).not.toContainText("đã gửi thành công");
  expect(requests).toBe(1);
});

test("Supabase lỗi SMTP/giới hạn tần suất không bị báo thành công", async ({ page }) => {
  await page.route("**/auth/v1/resend*", route => route.fulfill({
    status: 429,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify({ code: "over_email_send_rate_limit", msg: "email rate limit exceeded" }),
  }));
  await page.goto("/resend-confirmation");
  await page.getByLabel("MSSV hoặc email sinh viên DNTU").fill("12345678@dntu.edu.vn");
  await page.getByRole("button", { name: "Gửi lại thư xác nhận" }).click();
  await expect(page.locator('form [role="alert"]')).toContainText("giới hạn số lần gửi thư");
  await expect(page.getByRole("status")).toHaveCount(0);
});
