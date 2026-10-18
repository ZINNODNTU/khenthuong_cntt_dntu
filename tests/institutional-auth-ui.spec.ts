import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  for (const theme of ["light", "dark"] as const) {
    test(`Institutional auth · ${viewport.name} · ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript((value) => {
        localStorage.setItem("cntt-theme", value);
        document.documentElement.setAttribute("data-theme", value);
      }, theme);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const response = await page.goto("/register", { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Đăng ký tài khoản", exact: true })).toBeVisible();
      const password = page.locator("#register-password");
      const confirmPassword = page.locator("#register-confirm-password");
      await expect(password).toHaveAttribute("minlength", "12");
      await expect(confirmPassword).toHaveAttribute("minlength", "12");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflow).toBe(false);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(axe.violations, axe.violations.map(item => item.id + ": " + item.help).join("\n")).toEqual([]);
      const folder = path.resolve("ui-audit-results/screenshots");
      await mkdir(folder, { recursive: true });
      await page.screenshot({ path: path.join(folder, `register-${viewport.name}-${theme}.png`), fullPage: true });
    });
  }
}
