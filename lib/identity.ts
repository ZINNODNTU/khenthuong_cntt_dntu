const DNTU_DOMAIN = "dntu.edu.vn";
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}
export function loginEmailFromInput(value: string): string {
    const normalized = normalizeEmail(value);
    return normalized.includes("@") ? normalized : `${normalized}@${DNTU_DOMAIN}`;
}
export function studentIdFromDntuEmail(email: string): string | null {
    const normalized = normalizeEmail(email);
    const match = normalized.match(/^(\d+)@dntu\.edu\.vn$/);
    return match?.[1] ?? null;
}
export function isStudentDntuEmail(email: string): boolean {
    return studentIdFromDntuEmail(email) !== null;
}
export function unitEmailFromCode(code: string): string {
    const localPart = code.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!localPart) throw new Error("Mã đơn vị không thể dùng để tạo tài khoản.");
    return `${localPart}@${DNTU_DOMAIN}`;
}

