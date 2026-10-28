import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("Trang thông tin cá nhân là nội dung riêng tư, không hiển thị khi chưa đăng nhập", async ({ page }) => {
  await page.goto("/account/profile");
  await expect(page).not.toHaveURL(/\/account\/profile$/);
  await expect(page.getByText("Chi tiết tài khoản")).toHaveCount(0);
});

test("Phần B ghi rõ C7–C9 đều bắt buộc và không cho gửi trước khi hoàn tất", () => {
  const source = readFileSync("components/criterion-evidence-form.tsx", "utf8");
  expect(source).toContain("BẮT BUỘC đủ 3/3");
  expect(source).toContain('!hasEvidence("C7") ? "C7: Kết quả rèn luyện"');
  expect(source).toContain('!hasEvidence("C8") ? "C8: Kết quả học tập"');
  expect(source).toContain('!disciplinaryCommitment ? "C9: Cam kết chấp hành quy định"');
  expect(source).toContain('disabled={busy || !complete}');
  expect(source).toContain('mode.current === "submitted"');
  expect(source).toContain('validateCriterionEvidence(allCategories');
  expect(source).toContain('individual && !disciplinaryCommitment');
});

test("Trang thông tin cá nhân lấy dữ liệu theo session, không chấp nhận id tùy ý", () => {
  const source = readFileSync("app/(dashboard)/account/profile/page.tsx", "utf8");
  expect(source).toContain("await requireUser()");
  expect(source).toContain('studentIdFromDntuEmail(profile.email)');
  expect(source).toContain('profile.branch_code');
  expect(source).not.toContain("searchParams");
  expect(source).not.toContain("createAdminClient");
});
