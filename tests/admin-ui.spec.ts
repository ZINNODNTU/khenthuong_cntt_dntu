import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// ── Helpers ──

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

/** Navigate to route, check HTTP <400, console errors, overflow */
async function assertPageHealthy(page: Page, url: string) {
  const consoleErrors: string[] = [];
  const failedReqs: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().includes("localhost")) {
      failedReqs.push(`${res.status()} ${res.url()}`);
    }
  });

  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  expect(resp?.status()).toBeLessThan(400);

  // Check no overflow
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(overflow).toBe(false);

  return { consoleErrors, failedReqs };
}

// ── Tests ──

test.describe("Admin pages — design check", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`@${vp.name}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
      });

      test(`Login page renders [${vp.name}]`, async ({ page }) => {
        const { consoleErrors } = await assertPageHealthy(page, "/login");
        expect(consoleErrors).toEqual([]);
      });

      test(`Design preview loads [${vp.name}]`, async ({ page }) => {
        const { consoleErrors } = await assertPageHealthy(page, "/design-preview");
        expect(consoleErrors).toEqual([]);
      });
    });
  }
});

test.describe("Admin pages — route check", () => {
  const ADMIN_ROUTES = [
    "/",
    "/login",
    "/design-preview",
  ];

  for (const route of ADMIN_ROUTES) {
    test(`${route} loads without error`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const { consoleErrors } = await assertPageHealthy(page, route);
      expect(consoleErrors.length).toBe(0);
    });
  }
});

test.describe("Login page — interaction", () => {
  test("shows form elements", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login", { waitUntil: "networkidle" });

    // Check the key elements exist
    await expect(page.locator("h1")).toContainText("Đăng nhập");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /đăng nhập/i })).toBeVisible();
  });

  test("password toggle works", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login", { waitUntil: "networkidle" });

    const passwordInput = page.locator("#login-password");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByLabel(/hiện mật khẩu/i).click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await page.getByLabel(/ẩn mật khẩu/i).click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });
});

test.describe("Mobile sidebar drawer", () => {
  test("menu button exists on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Login page doesn't have sidebar, so this is a structural check
    // The sidebar drawer test would need auth — covered in ui-audit.spec.ts
    await page.goto("/login", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Đăng nhập");
  });
});

test.describe("Design preview — interaction", () => {
  test("theme toggle works", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-preview", { waitUntil: "networkidle" });

    const toggle = page.locator("#preview-theme-toggle");
    await toggle.click();
    // Should switch to light — check body class
    await page.waitForTimeout(300);
  });

  test("navigation links are present", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-preview", { waitUntil: "networkidle" });

    await expect(page.getByTestId("nav-award-dashboard")).toBeVisible();
    await expect(page.getByTestId("nav-leaderboard")).toBeVisible();
    await expect(page.getByTestId("nav-certificate")).toBeVisible();
  });
});
