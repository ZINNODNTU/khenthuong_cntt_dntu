import { expect, test } from "@playwright/test";

test.describe("Login experience", () => {
  test("loads the login form and supports password visibility", async ({ page }) => {
    const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);

    const username = page.getByRole("textbox", { name: "Tài khoản đăng nhập" });
    const password = page.locator("#login-password");
    await expect(username).toBeVisible();
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ẩn mật khẩu" }).click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(page.getByRole("heading", { name: /Đăng nhập/ })).toBeVisible();
  });

  test("shows a clear error and resets loading for rejected credentials", async ({ page }) => {
    let tokenRequestCount = 0;
    await page.route("**/auth/v1/token?**", async (route) => {
      tokenRequestCount++;
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ code: "invalid_credentials", message: "Invalid login credentials" }),
      });
    });
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Tài khoản đăng nhập" }).fill("00000000");
    await page.locator("#login-password").fill("incorrect-test-only");
    const button = page.getByRole("button", { name: "Đăng nhập hệ thống" });
    await button.click();
    await expect(page.getByText("Tài khoản hoặc mật khẩu không chính xác.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Đăng nhập hệ thống" })).toBeEnabled();
    expect(tokenRequestCount).toBe(1);
  });

  test("keeps private dashboard gated without a session", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/?\?error=session/);
    await expect(page.getByRole("heading", { name: /Đăng nhập/ })).toBeVisible();
  });
});
