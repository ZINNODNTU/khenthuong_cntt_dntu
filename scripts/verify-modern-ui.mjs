import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let failed = false;

function fail(message) {
  failed = true;
  console.error(`MODERN UI VERIFY FAILED: ${message}`);
}

const required = [
  "app/modern-ui.css",
  "components/app-shell.tsx",
  "docs/UI_UX_STANDARD.md",
];

for (const file of required) {
  if (!existsSync(resolve(process.cwd(), file))) {
    fail(`Missing ${file}`);
  }
}

const shell = readFileSync(
  resolve(process.cwd(), "components/app-shell.tsx"),
  "utf8",
);

for (const token of [
  "SIDEBAR_STORAGE_KEY",
  "PanelLeftClose",
  "PanelLeftOpen",
  "workspace-help-panel",
  "workspace-collapse-button",
  "aria-pressed",
  "data-tooltip",
]) {
  if (!shell.includes(token)) {
    fail(`AppShell is missing ${token}`);
  }
}

const layout = readFileSync(
  resolve(process.cwd(), "app/layout.tsx"),
  "utf8",
);

if (!layout.includes('import "./modern-ui.css"')) {
  fail("Root layout does not import modern-ui.css.");
}

const css = readFileSync(
  resolve(process.cwd(), "app/modern-ui.css"),
  "utf8",
);

for (const token of [
  ".workspace-shell.is-collapsed",
  ".workspace-help-panel",
  "@media (max-width: 900px)",
  "@media (prefers-reduced-motion: reduce)",
  ".skip-link",
  "--ui-primary: #2563eb",
]) {
  if (!css.includes(token)) {
    fail(`Modern UI CSS is missing ${token}`);
  }
}

if (!failed) {
  console.log("Modern student UI verification: PASS");
}

process.exitCode = failed ? 1 : 0;
