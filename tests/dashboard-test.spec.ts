import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOTS_DIR = path.resolve("tests/screenshots");

test.describe("Dashboard Admin Screenshots", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  test("chụp ảnh dashboard admin", async ({ page }) => {
    // Login với admin
    await page.goto("/login-variants/c");
    await page.waitForTimeout(1000);
    
    // Điền thông tin đăng nhập (dùng selector tương ứng với form)
    // Note: Cần điều chỉnh selector dựa trên form login thực
    
    // Nếu không login được, chụp dashboard với dữ liệu mock
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "dashboard-admin.png"), fullPage: true });
  });
});
