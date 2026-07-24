import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let failed = false;
const root = process.cwd();

function fail(message) {
  failed = true;
  console.error(`UI VERIFY FAILED: ${message}`);
}

function read(file) {
  const path = resolve(root, file);
  if (!existsSync(path)) {
    fail(`Missing ${file}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

const css = read("app/globals.css");
const shell = read("components/app-shell.tsx");
const layout = read("app/layout.tsx");
const modal = read("components/ui/modal.tsx");
const inputs = read("components/ui/input.tsx");
const pagination = read("components/ui/pagination.tsx");

for (const token of [
  "[data-theme=\"dark\"]",
  "@media (prefers-reduced-motion: reduce)",
  ".skip-link",
  ".table-responsive-card",
  ".pagination-btn-active",
  ":focus-visible",
]) {
  if (!css.includes(token)) fail(`globals.css is missing ${token}`);
}

for (const token of ["SIDEBAR_STORAGE_KEY", "aria-pressed", "aria-expanded", "data-tooltip", "cntt-theme"]) {
  if (!shell.includes(token)) fail(`AppShell is missing ${token}`);
}

if (!layout.includes('import "./globals.css"')) fail("Root layout does not import globals.css.");
if (!layout.includes("ThemeScript")) fail("Root layout is missing pre-paint theme script.");

for (const token of ["aria-labelledby", "aria-describedby", "FOCUSABLE", "document.body.style.overflow"]) {
  if (!modal.includes(token)) fail(`Modal is missing ${token}`);
}

for (const token of ["htmlFor", "aria-invalid", "aria-describedby"]) {
  if (!inputs.includes(token)) fail(`Form controls are missing ${token}`);
}

for (const token of ["aria-current", "aria-disabled", "pageWindow"]) {
  if (!pagination.includes(token)) fail(`Pagination is missing ${token}`);
}

for (const file of [
  "app/(dashboard)/applications/page.tsx",
  "app/(dashboard)/review/page.tsx",
  "app/(dashboard)/results/page.tsx",
  "app/(dashboard)/dashboard/page.tsx",
]) {
  const source = read(file);
  if (!source.includes("table-responsive-card")) fail(`${file} lacks responsive table strategy`);
}

if (!failed) console.log("Production UI verification: PASS");
process.exitCode = failed ? 1 : 0;

