import { test, expect } from "@playwright/test";

test.describe("Student registration and onboarding", () => {
  test("shows complete form and university email requirement", async ({ page }) => {
    const response = await page.goto("/register");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Đăng ký tài khoản" })).toBeVisible();
    await expect(page.locator("#register-name")).toBeVisible();
    await expect(page.locator("#register-email")).toBeVisible();
    await expect(page.locator("#register-birth")).toBeVisible();
    await expect(page.locator("#register-phone")).toBeVisible();
    await expect(page.locator("#register-branch")).toBeVisible();
    expect(await page.locator("#register-branch option").count()).toBeGreaterThan(1);
  });

  test("rejects non-DNTU email without creating an Auth user", async ({ request }) => {
    const response = await request.post("/api/auth/register", {
      data: {
        fullName: "Test Validation Only",
        email: "student@other.edu.vn",
        branchCode: "22DTH1",
        birthDate: "2000-01-01",
        phone: "0912345678",
        password: "DummyValidationOnly12",
        confirmPassword: "DummyValidationOnly12",
      },
    });
    if (response.status() === 503) {
      test.skip(true, "Rate limiter fails closed because server-only Supabase secret is not configured on local.");
    }
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain("MSSV@dntu.edu.vn");
  });

  test("rejects empty student details without creating an Auth user", async ({ request }) => {
    const response = await request.post("/api/auth/register", {
      data: {
        fullName: "",
        email: "12345678@dntu.edu.vn",
        branchCode: "",
        birthDate: "",
        phone: "",
        password: "DummyValidationOnly12",
        confirmPassword: "DummyValidationOnly12",
      },
    });
    if (response.status() === 503) {
      test.skip(true, "Rate limiter fails closed because server-only Supabase secret is not configured on local.");
    }
    expect(response.status()).toBe(400);
  });

  test("does not allow anonymous users to finish a student profile", async ({ request }) => {
    const response = await request.post("/api/profile/complete", {
      data: { fullName: "Test", branchCode: "22DTH1", birthDate: "2000-01-01", phone: "0912345678" },
    });
    expect(response.status()).toBe(401);
  });

  test("gates complete-profile page for anonymous users", async ({ page }) => {
    await page.goto("/complete-profile");
    await expect(page).toHaveURL(/error=session|login/);
  });
});
