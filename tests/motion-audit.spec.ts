import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const output = path.resolve("ui-audit-results/motion");

test.beforeEach(async ({ page }) => {
  await mkdir(output, { recursive: true });
  await page.addInitScript(() => {
    (window as Window & { __layoutShifts?: number[] }).__layoutShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) (window as Window & { __layoutShifts?: number[] }).__layoutShifts?.push(entry.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/design-preview", { waitUntil: "networkidle" });
  await expect(page.locator("[data-motion-ready=true]")).toBeVisible();
});

test("default hover active states and stable geometry", async ({ page }) => {
  const card = page.getByTestId("bento-overview");
  await page.screenshot({ path: path.join(output, "living-default.png"), fullPage: true });
  const before = await card.boundingBox();
  await card.hover({ position: { x: 220, y: 120 } });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(output, "living-hover.png"), fullPage: true });
  const after = await card.boundingBox();
  expect(Math.abs((before?.width ?? 0) - (after?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((before?.height ?? 0) - (after?.height ?? 0))).toBeLessThanOrEqual(1);
  await page.getByTestId("nav-leaderboard").hover();
  await page.getByTestId("hero-cta").focus();
  await page.screenshot({ path: path.join(output, "living-active.png"), fullPage: true });
  const shifts = await page.evaluate(() => (window as Window & { __layoutShifts?: number[] }).__layoutShifts ?? []);
  const cls = shifts.reduce((sum, value) => sum + value, 0);
  await writeFile(path.join(output, "metrics.json"), JSON.stringify({ cls, shifts }, null, 2));
  expect(cls).toBeLessThanOrEqual(0.01);
});

test("animations avoid long main-thread blocking", async ({ page }) => {
  await page.evaluate(() => {
    (window as Window & { __motionBlocking?: number[] }).__motionBlocking = [];
    if (!("PerformanceObserver" in window) || !PerformanceObserver.supportedEntryTypes.includes("long-animation-frame")) return;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { blockingDuration?: number })[]) {
        (window as Window & { __motionBlocking?: number[] }).__motionBlocking?.push(entry.blockingDuration ?? entry.duration);
      }
    });
    observer.observe({ type: "long-animation-frame" });
    (window as Window & { __motionObserver?: PerformanceObserver }).__motionObserver = observer;
  });
  await page.getByTestId("bento-overview").hover({ position: { x: 220, y: 120 } });
  await page.getByTestId("nav-leaderboard").hover();
  await page.locator("#preview-theme-toggle").click();
  await page.waitForTimeout(1200);
  const blockingDurations = await page.evaluate(() => {
    (window as Window & { __motionObserver?: PerformanceObserver }).__motionObserver?.disconnect();
    return (window as Window & { __motionBlocking?: number[] }).__motionBlocking ?? [];
  });
  const severeFrames = blockingDurations.filter((duration) => duration > 100);
  expect(severeFrames, `Severe interaction blocking frames: ${severeFrames.join(", ")}`).toEqual([]);
});

test("mobile and reduced motion remain stable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  const card = page.getByTestId("bento-overview");
  const transform = await card.evaluate((element) => getComputedStyle(element).transform);
  expect(transform).toBe("none");
  await page.screenshot({ path: path.join(output, "living-mobile-reduced.png"), fullPage: true });
});
