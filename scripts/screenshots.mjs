import { chromium } from "@playwright/test";

const BASE = "http://localhost:3456";
const OUT = "C:\\Users\\jakik\\.gemini\\antigravity\\brain\\5ffb604b-0fb2-46c7-97b4-5d47c8c6945a";

const viewports = [
  { name: "mobile-375", w: 375, h: 812 },
  { name: "mobile-390", w: 390, h: 844 },
  { name: "tablet-768", w: 768, h: 1024 },
  { name: "laptop-1366", w: 1366, h: 768 },
  { name: "desktop-1920", w: 1920, h: 1080 },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.w, height: vp.h });

    // Login page
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/login-${vp.name}.png`, fullPage: true });

    // Design preview page (no auth needed)
    await page.goto(`${BASE}/design-preview`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/design-${vp.name}.png`, fullPage: true });
  }

  // Also test login variants
  for (const letter of ["a", "b", "c"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/login-variants/${letter}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/login-variant-${letter}.png`, fullPage: true });
  }

  await browser.close();
  console.log("DONE");
}

main().catch((err) => { console.error(err); process.exit(1); });
