import { expect, test } from "@playwright/test";

test("Có thể mở trang gửi lại email xác nhận từ đăng nhập", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Gửi lại thư xác nhận" }).click();
  await expect(page).toHaveURL(/\/resend-confirmation$/);
  await expect(page.getByRole("heading", { name: "Gửi lại email xác nhận" })).toBeVisible();
});

test("Không gửi yêu cầu nếu email không thuộc MSSV DNTU", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/auth/email", route => {
    requests++;
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.goto("/resend-confirmation");
  await page.getByLabel("MSSV hoặc email sinh viên DNTU").fill("outside@gmail.com");
  await page.getByRole("button", { name: "Gửi lại thư xác nhận" }).click();
  await expect(page.locator('form [role="alert"]')).toContainText("MSSV@dntu.edu.vn");
  expect(requests).toBe(0);
});

test("Yêu cầu gửi lại chạy qua same-origin gateway; tiếp nhận không phải đã phát", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/auth/email", async route => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({ purpose: "signup", email: "12345678@dntu.edu.vn" });
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"code":"ACCEPTED"}' });
  });
  await page.goto("/resend-confirmation");
  await page.getByLabel("MSSV hoặc email sinh viên DNTU").fill("12345678");
  await page.getByRole("button", { name: "Gửi lại thư xác nhận" }).click();
  await expect(page.getByRole("status")).toContainText("Đã tiếp nhận yêu cầu");
  await expect(page.getByRole("status")).not.toContainText("đã gửi thành công");
  expect(requests).toBe(1);
});

test("Giới hạn tần suất không bị báo thành công", async ({ page }) => {
  await page.route("**/api/auth/email", route => route.fulfill({
    status: 429,
    contentType: "application/json",
    body: '{"ok":false,"code":"RATE_LIMITED"}',
  }));
  await page.goto("/resend-confirmation");
  await page.getByLabel("MSSV hoặc email sinh viên DNTU").fill("12345678@dntu.edu.vn");
  await page.getByRole("button", { name: "Gửi lại thư xác nhận" }).click();
  await expect(page.locator('form [role="alert"]')).toContainText("giới hạn số lần gửi");
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("Gateway từ chối request không hợp lệ trước khi gửi email", async ({ request }) => {
  const options = { headers: { "content-type": "application/json" } };
  const invalid = await request.post("/api/auth/email", { data: { purpose: "recovery", email: "bad-email" }, ...options });
  expect(invalid.status()).toBe(400);
  const wrongType = await request.post("/api/auth/email", { data: { purpose: "reset_all", email: "12345678@dntu.edu.vn" }, ...options });
  expect(wrongType.status()).toBe(400);
  const crossSite = await request.post("/api/auth/email", {
    data: { purpose: "recovery", email: "12345678@dntu.edu.vn" },
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
  });
  expect(crossSite.status()).toBe(403);
});
