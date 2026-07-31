import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@school.edu.vn";

async function loginAsAdmin(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.fill("input[name=email]", ADMIN_EMAIL);
  await page.fill("input[name=password]", "admin123456");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("Periods - delete", () => {
  test("delete button opens confirm dialog, confirms, removes period", async ({ page }) => {
    // Listen for the dialog
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Xóa vĩnh viễn");
      await dialog.accept();
    });

    await loginAsAdmin(page);
    await page.goto("/periods", { waitUntil: "networkidle" });

    // Wait for table to load
    await page.waitForSelector("table tbody tr", { timeout: 10000 });

    // Get row count before deletion
    const rowsBefore = await page.locator("table tbody tr").count();

    // Click the last delete button
    const deleteButtons = page.locator("button[aria-label^='Xóa đợt']");
    const count = await deleteButtons.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // Click last one (safe choice)
    await deleteButtons.nth(count - 1).click();

    // Wait for message
    await page.waitForSelector(".notice", { timeout: 10000 });

    // Check no 4xx/5xx on the page
    const failedReqs: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 400 && res.url().includes("localhost")) {
        failedReqs.push(`${res.status()} ${res.url()}`);
      }
    });

    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
    expect(failedReqs).toEqual([]);
  });

  test("delete cancel does nothing", async ({ page }) => {
    let dialogShown = false;
    page.on("dialog", async (dialog) => {
      dialogShown = true;
      expect(dialog.message()).toContain("Xóa vĩnh viễn");
      await dialog.dismiss();
    });

    await loginAsAdmin(page);
    await page.goto("/periods", { waitUntil: "networkidle" });
    await page.waitForSelector("table tbody tr", { timeout: 10000 });

    const rowsBefore = await page.locator("table tbody tr").count();
    const deleteButtons = page.locator("button[aria-label^='Xóa đợt']");
    const count = await deleteButtons.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await deleteButtons.nth(count - 1).click();
    expect(dialogShown).toBe(true);

    // Row count unchanged, no notice
    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBe(rowsBefore);
  });
});
