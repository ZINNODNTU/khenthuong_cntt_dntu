import test from "node:test";
import assert from "node:assert/strict";
import { profileUpdateCooldown, PROFILE_UPDATE_COOLDOWN_SECONDS } from "../lib/profile-update-throttle.ts";

test("new profile without previous update can save", () => {
  assert.equal(profileUpdateCooldown(null), 0);
  assert.equal(profileUpdateCooldown(undefined), 0);
});
test("recent edits are limited per account using persistent DB update timestamp", () => {
  const now = Date.parse("2026-10-28T04:25:30.000Z");
  assert.equal(profileUpdateCooldown("2026-10-28T04:25:28.000Z", now), 13);
  assert.equal(profileUpdateCooldown("2026-10-28T04:25:15.000Z", now), 0);
  assert.equal(profileUpdateCooldown("2026-10-28T04:20:00.000Z", now), 0);
});
test("bad update timestamp fails closed and cannot produce unbounded retry", () => {
  assert.equal(profileUpdateCooldown("bad-timestamp"), PROFILE_UPDATE_COOLDOWN_SECONDS);
  assert.equal(profileUpdateCooldown("2090-01-01T00:00:00Z"), PROFILE_UPDATE_COOLDOWN_SECONDS);
});
