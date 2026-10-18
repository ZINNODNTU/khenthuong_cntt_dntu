/**
 * An evaluation period is defined in Vietnam civil time, regardless of the
 * browser's or deployment server's local timezone (Vietnam is UTC+07 year-round).
 * Database timestamps are UTC instants; evidence windows are DATE-only values.
 */
const VN_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

export function isoToVietnamInput(value: string): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  return new Date(time + VN_UTC_OFFSET_MS).toISOString().slice(0, 16);
}

export function vietnamInputToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Thời gian phải theo định dạng ngày và giờ hợp lệ.");
  const [, year, month, day, hour, minute] = match;
  const utc = Date.UTC(
    Number(year), Number(month) - 1, Number(day),
    Number(hour) - 7, Number(minute),
  );
  if (!Number.isFinite(utc) || isoToVietnamInput(new Date(utc).toISOString()) !== value) {
    throw new Error("Ngày hoặc giờ không tồn tại. Vui lòng chọn lại.");
  }
  return new Date(utc).toISOString();
}

export function formatVietnamDatetime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

export function validDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function formatDateOnly(value: string): string {
  return validDateOnly(value)
    ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
    : "—";
}
