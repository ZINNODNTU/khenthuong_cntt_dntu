import { expect, test } from "@playwright/test";

test.describe("Server-rendered login feedback", () => {
  test("renders session expiration without a client-only fallback", async ({ page }) => {
    const response = await page.goto("/login?error=session", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("alert")).toContainText("Phiên đã hết hạn");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByText("Đang chuẩn bị biểu mẫu...")).toHaveCount(0);
  });

  test("renders email confirmation message at the root entry point", async ({ page }) => {
    const response = await page.goto("/?confirmed=1", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("alert")).toContainText("Email đã được xác nhận");
  });
});
