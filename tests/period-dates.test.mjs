import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  isoToVietnamInput, vietnamInputToIso, formatVietnamDatetime,
  validDateOnly, formatDateOnly,
} from "../lib/period-dates.ts";

test("Vietnam period times round-trip without shifting the calendar date", () => {
  for (const value of [
    "2026-09-08T22:40",
    "2026-10-08T22:40",
    "2026-10-31T22:40",
    "2026-01-01T00:00",
    "2026-12-31T23:59",
  ]) {
    const iso = vietnamInputToIso(value);
    assert.equal(isoToVietnamInput(iso), value);
    assert.equal(new Date(iso).toISOString(), iso);
  }
});

test("explicit +07 timezone yields same value regardless of browser host timezone", () => {
  assert.equal(vietnamInputToIso("2026-10-08T22:40"), "2026-10-08T15:40:00.000Z");
  assert.equal(isoToVietnamInput("2026-10-08T15:40:00.000Z"), "2026-10-08T22:40");
  assert.match(formatVietnamDatetime("2026-10-08T15:40:00.000Z"), /08\/10\/2026/);
  const script = `const m=await import('./lib/period-dates.ts'); console.log(JSON.stringify([m.vietnamInputToIso('2026-10-08T22:40'),m.isoToVietnamInput('2026-10-08T15:40:00.000Z')]))`;
  const expected = JSON.stringify(["2026-10-08T15:40:00.000Z", "2026-10-08T22:40"]);
  for (const timeZone of ["UTC", "Asia/Ho_Chi_Minh", "America/Los_Angeles"]) {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "--eval", script], {
      cwd: process.cwd(), env: { ...process.env, TZ: timeZone },
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    assert.equal(output, expected, timeZone);
  }
});

test("evidence ranges are date-only, not shifted by timezone", () => {
  assert.equal(validDateOnly("2025-09-01"), true);
  assert.equal(validDateOnly("2026-09-01"), true);
  assert.equal(formatDateOnly("2026-09-01"), "01/09/2026");
  assert.equal(formatDateOnly("2025-09-01"), "01/09/2025");
  assert.equal(validDateOnly("2026-02-30"), false);
  assert.equal(validDateOnly("2026-13-01"), false);
  assert.equal(validDateOnly("08/09/2026"), false);
  assert.equal(validDateOnly("2026-09-01T00:00:00.000Z"), false);
});

test("invalid or missing civil datetimes must never be silently saved", () => {
  for (const value of [
    "2026-02-30T20:00", "2026-13-01T10:00", "",
    "2026-10-08", "2026-10-08T25:00", "2026-10-08T22:60",
  ]) {
    assert.throws(() => vietnamInputToIso(value));
  }
});
