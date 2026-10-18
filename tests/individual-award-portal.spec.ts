import { expect, test } from "@playwright/test";

test("Website nhận diện khen thưởng Đoàn – Hội Khoa CNTT", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle(/Xét khen thưởng Đoàn – Hội Khoa Công nghệ thông tin/);
  await expect(page.getByRole("heading", { name: /Xét khen thưởng Đoàn – Hội Khoa CNTT/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
  await expect(page.getByText("09 tiêu chí cá nhân C1–C9")).toBeVisible();
});

test("Trang đăng ký không giới thiệu xét tập thể", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Đăng ký tài khoản", exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Bộ tiêu chí tập thể");
});

test("Các trang nghiệp vụ vẫn yêu cầu xác thực", async ({ page }) => {
  const res = await page.goto("/applications/new");
  expect([307, 200].includes(res?.status() || 0)).toBe(true);
  await expect(page).toHaveURL(/(?:\/login|\/?\?error=session)/);
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
});
