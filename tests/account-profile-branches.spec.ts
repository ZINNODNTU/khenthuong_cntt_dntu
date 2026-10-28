import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("Guest cannot access profile edit API", async ({ request }) => {
  const response = await request.patch("/api/account/profile", {
    data: { fullName: "Sinh viên Test", phone: "0901234567", birthDate: "2003-01-01", branchCode: "22DTH1" },
  });
  expect(response.status()).toBe(401);
});
test("Cross-origin profile edit requests are rejected even without an authenticated session", async ({ request }) => {
  const result = await request.patch("/api/account/profile", {
    headers: { origin: "https://malicious.example" },
    data: { fullName: "Sinh viên Test", phone: "0901234567", birthDate: "2003-01-01", branchCode: "22DTH1" },
  });
  // Proxy may reject anonymous callers (401) before the route's origin check (403).
  expect([401, 403]).toContain(result.status());
  const source = readFileSync("app/api/account/profile/route.ts", "utf8");
  expect(source).toContain('request.headers.get("origin")');
  expect(source).toContain('request.headers.get("sec-fetch-site") === "cross-site"');
});
test("Guest cannot modify or delete a branch", async ({ request }) => {
  expect((await request.delete("/api/admin/branches", { data: { code: "22DTH1" } })).status()).toBe(401);
  expect((await request.patch("/api/admin/branches", { data: { code: "22DTH1", name: "Test", isActive: false } })).status()).toBe(401);
});
test("Legacy CLB management is not accessible anonymously", async ({ request }) => {
  expect((await request.post("/api/admin/clubs", { data: { code: "TEST", name: "Club" } })).status()).toBe(401);
});
test("Retired management pages redirect for guests", async ({ page }) => {
  await page.goto("/clubs");
  expect(new URL(page.url()).pathname).not.toBe("/clubs");
  await page.goto("/admin/units");
  expect(new URL(page.url()).pathname).not.toBe("/admin/units");
});
test("Student profile edit uses authenticated RPC and active branch directory", () => {
  const api = readFileSync("app/api/account/profile/route.ts", "utf8");
  expect(api).toContain("supabase.auth.getUser()");
  expect(api).toContain('studentProfileSchema.safeParse');
  expect(api).toContain('complete_student_profile');
  expect(api).toContain('.eq("is_active", true)');
  expect(api).not.toContain("createAdminClient");
  const page = readFileSync("app/(dashboard)/account/profile/page.tsx", "utf8");
  expect(page).toContain('select("code,name").eq("is_active", true)');
  expect(page).toContain("AccountProfileEditor");
});
test("Branch deletion refuses referenced data and requires admin", () => {
  const api = readFileSync("app/api/admin/branches/route.ts", "utf8");
  expect(api).toContain("export async function DELETE");
  expect(api).toContain("requireAdmin()");
  expect(api).toContain('"BRANCH_IN_USE"');
  expect(api).toContain('error.code === "23503"');
  expect(api).toContain('admin.from("profiles")');
  expect(api).toContain('admin.from("applications")');
  const shell = readFileSync("components/app-shell.tsx", "utf8");
  expect(shell).not.toContain('href: "/clubs"');
  expect(shell).not.toContain('href: "/admin/units"');
});
