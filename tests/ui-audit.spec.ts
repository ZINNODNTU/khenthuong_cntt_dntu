import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;
const themes = ["light", "dark"] as const;
const pages = [
  { name: "login", url: "/login" },
  { name: "design-preview", url: "/design-preview" },
] as const;
const output = path.resolve("ui-audit-results");

async function auditRuntime(page: Page) {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    networkErrors.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "failed"}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("favicon")) {
      networkErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return { consoleErrors, networkErrors };
}

for (const target of pages) {
  for (const viewport of viewports) {
    for (const theme of themes) {
      test(`${target.name} · ${viewport.name} · ${theme}`, async ({ page }) => {
        await mkdir(path.join(output, "screenshots"), { recursive: true });
        await page.setViewportSize(viewport);
        await page.addInitScript((selectedTheme) => {
          localStorage.setItem("cntt-theme", selectedTheme);
          document.documentElement.setAttribute("data-theme", selectedTheme);
        }, theme);
        await page.emulateMedia({ colorScheme: theme });
        const runtime = await auditRuntime(page);
        const response = await page.goto(target.url, { waitUntil: "networkidle" });
        expect(response?.status(), "HTTP status").toBeLessThan(400);
        await page.evaluate((selectedTheme) => document.documentElement.setAttribute("data-theme", selectedTheme), theme);
        await page.waitForTimeout(300);

        const geometry = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          pageWidth: document.documentElement.scrollWidth,
          offenders: [...document.querySelectorAll<HTMLElement>("body *")]
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.width > 0 && (rect.right > document.documentElement.clientWidth + 1 || rect.left < -1);
            })
            .slice(0, 20)
            .map((element) => `${element.tagName.toLowerCase()}.${element.className}`),
        }));

        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const fileName = `${target.name}-${viewport.name}-${theme}`;
        await page.screenshot({ path: path.join(output, "screenshots", `${fileName}.png`), fullPage: true });
        await writeFile(path.join(output, `${fileName}.json`), JSON.stringify({ geometry, violations: axe.violations, ...runtime }, null, 2));

        expect(geometry.pageWidth, `Overflow: ${geometry.offenders.join(", ")}`).toBeLessThanOrEqual(geometry.viewport + 1);
        expect(axe.violations, axe.violations.map((v) => `${v.id}: ${v.help}`).join("\n")).toEqual([]);
        expect(runtime.consoleErrors, "Console errors").toEqual([]);
        expect(runtime.networkErrors, "Network errors").toEqual([]);
      });
    }
  }
}
