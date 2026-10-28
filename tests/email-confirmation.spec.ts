import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const AUTH_ORIGIN = "https://khenthuong-cntt-dntu.vercel.app";

test("Auth recovery/signup templates always use production host, never localhost", () => {
  for (const [file, type] of [["recovery.html", "recovery"], ["confirm-signup.html", "email"]] as const) {
    const html = readFileSync(resolve("supabase", "email-templates", file), "utf8");
    expect(html).toContain(`href="${AUTH_ORIGIN}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${type}"`);
    expect(html).not.toMatch(/localhost|127\.0\.0\.1|http:\/\//i);
  }
});

test("Email scanners only GET the link; token must not be consumed until a human confirms", async ({ request }) => {
  const tokenHash = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
  const response = await request.get(`/auth/confirm?token_hash=${tokenHash}&type=recovery`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('form method="POST" action="/auth/confirm"');
  expect(html).toContain('name="token_hash"');
  expect(html).toContain("Tiếp tục đặt lại mật khẩu");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
});

test("Email verification page supports signup email without auto-redirect", async ({ request }) => {
  const response = await request.get("/auth/confirm?token_hash=abcdef0123456789abcdef0123456789&type=email");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Xác nhận email tài khoản");
});

test("Invalid confirmation links are safely rejected and never expose a token", async ({ request }) => {
  const response = await request.get("/auth/confirm?token_hash=bad%3Cscript%3E&type=email", { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toContain("/auth/finish?error=invalid_link");
  expect(response.headers().location).not.toContain("token_hash");
});

test("Expired signup confirmation offers resend rather than password recovery", async ({ page }) => {
  await page.goto("/auth/finish?error=invalid_link&flow=signup");
  await expect(page.getByRole("link", { name: "Gửi lại email xác nhận" })).toHaveAttribute("href", "/resend-confirmation");
});

test("Invalid POST does not consume OTP or redirect with POST semantics", async ({ request }) => {
  const response = await request.post("/auth/confirm", {
    form: { token_hash: "invalid", type: "recovery" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toContain("/auth/finish?error=invalid_link");
});
