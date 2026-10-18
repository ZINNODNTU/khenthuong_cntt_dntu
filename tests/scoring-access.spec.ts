import { expect, test } from "@playwright/test";

const applicationId = "a985890b-10b1-45ef-9510-b0441ba1e792";
const periodId = "48674ed0-ce1c-4584-b094-371fb1217b31";

test("anonymous users cannot configure scoring rubrics", async ({ request }) => {
  const response = await request.post("/api/admin/rubrics", {
    data: {
      periodId,
      applicationType: "individual",
      weights: { C1: 20, C2: 20, C3: 15, C4: 15, C5: 15, C6: 15 },
      minPercentage: 70,
    },
  });
  if (response.status() === 503) test.skip(true, "Supabase chưa cấu hình; cần chạy xác thực quyền trên staging.");
  expect(response.status()).toBe(401);
});

test("anonymous users cannot write a dossier's numeric score", async ({ request }) => {
  const response = await request.post(`/api/applications/${applicationId}/scores`, {
    data: { code: "C1", points: 10, note: "Minh chứng đã thẩm định." },
  });
  if (response.status() === 503) test.skip(true, "Supabase chưa cấu hình; cần chạy xác thực quyền trên staging.");
  expect(response.status()).toBe(401);
});
