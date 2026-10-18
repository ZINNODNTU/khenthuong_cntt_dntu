import { test, expect } from "@playwright/test";
import { createPeriodSchema, updatePeriodSchema } from "../lib/validation";

const persistedPeriod = {
  id: "fdf5e3db-8608-4d66-9894-1c6a22cb09be",
  name: "Công tác Đoàn và phong trào sinh viên năm học 2025 - 2026",
  description: "",
  // PostgreSQL timestamptz / PostgREST commonly serializes +00:00, not Z.
  startsAt: "2026-09-08T15:40:00+00:00",
  endsAt: "2026-10-31T15:40:00+00:00",
  evidenceStartsOn: "2025-09-01",
  evidenceEndsOn: "2026-09-01",
  status: "open" as const,
  allowIndividual: true,
  allowBranchCollective: true,
  allowClubCollective: true,
};

test.describe("Quản lý đợt xét - cập nhật trạng thái", () => {
  test("Mở nhận hồ sơ chấp nhận timestamp UTC +00:00 từ Supabase", () => {
    const result = updatePeriodSchema.safeParse(persistedPeriod);
    expect(result.success, JSON.stringify(result.success ? null : result.error.issues)).toBe(true);
    if (result.success) {
      expect(result.data.startsAt).toBe("2026-09-08T15:40:00.000Z");
      expect(result.data.endsAt).toBe("2026-10-31T15:40:00.000Z");
      expect(result.data.status).toBe("open");
    }
  });

  test("Đóng đợt và cập nhật ngày minh chứng dùng cùng định dạng UTC", () => {
    const closed = updatePeriodSchema.safeParse({
      ...persistedPeriod, status: "closed", evidenceEndsOn: "2025-09-01",
    });
    expect(closed.success, JSON.stringify(closed.success ? null : closed.error.issues)).toBe(true);
    if (closed.success) {
      expect(closed.data.evidenceEndsOn).toBe("2025-09-01");
      expect(closed.data.status).toBe("closed");
    }
  });

  test("Hỗ trợ offset +07:00 và Z khi lưu/chuyển trạng thái", () => {
    const vn = updatePeriodSchema.safeParse({
      ...persistedPeriod,
      startsAt: "2026-09-08T22:40:00+07:00",
      endsAt: "2026-10-31T22:40:00+07:00",
    });
    expect(vn.success).toBe(true);
    if (vn.success) expect(vn.data.startsAt).toBe("2026-09-08T15:40:00.000Z");

    const created = createPeriodSchema.safeParse({
      ...persistedPeriod,
      startsAt: "2026-09-08T15:40:00.000Z",
      endsAt: "2026-10-31T15:40:00.000Z",
      status: "draft",
    });
    expect(created.success).toBe(true);
  });

  test("Từ chối giờ không có múi giờ, ngày minh chứng không tồn tại", () => {
    expect(updatePeriodSchema.safeParse({
      ...persistedPeriod, startsAt: "2026-09-08T15:40:00",
    }).success).toBe(false);

    expect(updatePeriodSchema.safeParse({
      ...persistedPeriod, evidenceEndsOn: "2026-02-30",
    }).success).toBe(false);

    expect(updatePeriodSchema.safeParse({
      ...persistedPeriod, endsAt: "2026-08-01T15:40:00Z",
    }).success).toBe(false);
  });
});
