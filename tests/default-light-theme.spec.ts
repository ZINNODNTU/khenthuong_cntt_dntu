import { expect, test } from "@playwright/test";

test.describe("Giao diện sáng mặc định", () => {
  test("mặc định sáng dù hệ điều hành đang dùng giao diện tối", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => localStorage.getItem("cntt-theme"))).toBeNull();
  });

  test("trang đăng ký cũng luôn mặc định sáng", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/register");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("tôn trọng lựa chọn tối đã được lưu", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("cntt-theme", "dark"));
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("giá trị theme không hợp lệ trở về sáng", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("cntt-theme", "system"));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
