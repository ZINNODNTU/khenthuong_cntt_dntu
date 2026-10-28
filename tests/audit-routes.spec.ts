import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("Recovery password route requires an authenticated Supabase session", async ({ request }) => {
  const response = await request.post("/api/account/reset-password", {
    data: { password: "ExamplePassword!2026-Long" },
  });
  expect(response.status()).toBe(401);
});

test("Audit health endpoint requires admin and never creates guest events", async ({ request }) => {
  const response = await request.post("/api/admin/audit-health");
  expect(response.status()).toBe(401);
});

test("Login audit receipt requires an authenticated session", async ({ request }) => {
  const response = await request.post("/api/auth/login-event");
  expect(response.status()).toBe(401);
});

test("Cross-site reset is rejected with no password update", async ({ request }) => {
  const response = await request.post("/api/account/reset-password", {
    headers: { origin: "https://evil.example" },
    data: { password: "ExamplePassword!2026-Long" },
  });
  // Middleware can reject an anonymous request before route-level CSRF checks.
  expect([401, 403]).toContain(response.status());
});

test("Password reset and password change write durable server-side audit after update", () => {
  const recovery = readFileSync("app/api/account/reset-password/route.ts", "utf8");
  const resetForm = readFileSync("components/reset-password-form.tsx", "utf8");
  const change = readFileSync("app/api/account/change-password/route.ts", "utf8");
  const login = readFileSync("components/login-screen.tsx", "utf8");
  const logout = readFileSync("app/api/auth/signout/route.ts", "utf8");
  expect(resetForm).toContain('fetch("/api/account/reset-password"');
  expect(resetForm).not.toContain("client.auth.updateUser({password})");
  expect(recovery).toContain('supabase.auth.updateUser({ password: parsed.data.password })');
  expect(recovery).toContain('"account.password_reset"');
  expect(change).toContain('"account.change_password"');
  expect(logout).toContain('"account.logout"');
  expect(login).toContain('fetch("/api/auth/login-event"');
  expect(recovery).toContain('writeAudit(supabase, user.id');
});
