import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOTS_DIR = path.resolve("tests/screenshots");

test.describe("Workflow UI Screenshots", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  test("chụp ảnh login chính - Nebula", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "login-main.png"), fullPage: true });
  });
});
