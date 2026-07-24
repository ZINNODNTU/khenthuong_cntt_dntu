import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const pagination = readFileSync(new URL("../components/ui/pagination.tsx", import.meta.url), "utf8");

for (const family of ["primary", "secondary", "neutral", "success", "warning", "error", "info"]) {
  for (const shade of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
    assert(css.includes(`--${family}-${shade}:`), `Missing --${family}-${shade}`);
  }
}
for (const token of ["--radius-xs", "--radius-2xl", "--shadow-xs", "--z-modal", "--duration-fast", "--text-display"]) {
  assert(css.includes(`${token}:`), `Missing ${token}`);
}
assert(pagination.includes("pageWindow"), "Pagination window missing");
assert(pagination.includes("aria-current"), "Pagination current-page semantics missing");

console.log("UI self-check: PASS");
