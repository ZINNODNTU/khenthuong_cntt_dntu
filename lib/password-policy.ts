const COMMON_PASSWORDS = new Set([
  "password", "password123", "123456", "123456789", "12345678",
  "qwerty", "qwerty123", "admin", "admin123", "welcome", "iloveyou",
]);

export type PasswordIdentity = {
  email?: string | null;
  studentId?: string | null;
  unitCode?: string | null;
};

export function validatePassword(password: string, identity: PasswordIdentity = {}): string | null {
  if (password.length < 12) return "Mật khẩu phải có ít nhất 12 ký tự.";
  if (password.length > 128) return "Mật khẩu không được vượt quá 128 ký tự.";
  const normalized = password.trim().toLowerCase();
  if (COMMON_PASSWORDS.has(normalized)) return "Mật khẩu quá phổ biến.";
  const values = [identity.email, identity.studentId, identity.unitCode]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((value) => value.length >= 4);
  if (values.some((value) => normalized.replace(/[^a-z0-9]/g, "").includes(value))) {
    return "Mật khẩu không được chứa thông tin định danh tài khoản.";
  }
  return null;
}
