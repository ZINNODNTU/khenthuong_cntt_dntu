import { test, expect } from "@playwright/test";

const target = "11111111-1111-4111-8111-111111111111";

test.describe("Bảo vệ các thao tác chấm hồ sơ", () => {
  // These checks use an anonymous client against local Next.js only.
  // The Next.js server loads its own .env.local; Playwright needs no Supabase env variables.
  test("không cho khách nhận hồ sơ khi chưa đăng nhập", async ({ request }) => {
    const response = await request.post(`/api/applications/${target}/assignment`, {
      data: { action: "claim" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("không cho khách chấm tiêu chí", async ({ request }) => {
    const response = await request.post(`/api/applications/${target}/criteria`, {
      data: { code: "C7", status: "verified" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("không cho khách kết luận hồ sơ", async ({ request }) => {
    const response = await request.post(`/api/applications/${target}/decision`, {
      data: { status: "passed", comment: "" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("không cho khách xuất kết quả nội bộ", async ({ request }) => {
    const response = await request.get("/api/reports/results");
    expect([401, 403]).toContain(response.status());
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("không cho khách tải phiếu kết quả ở khu vực đăng nhập", async ({ page }) => {
    await page.goto(`/applications/${target}/report`);
    expect(page.url()).not.toMatch(/\/applications\/[a-f0-9-]+\/report\/?$/);
    await expect(page.getByText("PHIẾU TỔNG HỢP KẾT QUẢ XÉT HỒ SƠ KHEN THƯỞNG")).toHaveCount(0);
  });
});
