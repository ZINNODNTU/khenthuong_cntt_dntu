import { z } from "zod";
import { studentIdFromDntuEmail } from "@/lib/identity";
import { validatePassword } from "@/lib/password-policy";

export const studentBirthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh phải có định dạng YYYY-MM-DD.")
  .refine((v) => {
    const date = new Date(v + "T00:00:00Z");
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== v) return false;
    const cutoff = new Date();
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);
    return date <= cutoff && date >= new Date("1900-01-01");
  }, "Người nộp hồ sơ phải đủ 18 tuổi và ngày sinh hợp lệ.");

export const studentPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:0\d{9}|\+84\d{9})$/, "Số điện thoại phải có 10 chữ số (hoặc +84 và 9 chữ số).");

export const studentProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Nhập đầy đủ họ và tên.").max(150),
  branchCode: z.string().trim().min(2).max(30).regex(/^[A-Z0-9_-]+$/, "Mã Chi đoàn không hợp lệ."),
  phone: studentPhoneSchema,
  birthDate: studentBirthDateSchema,
});

export const studentRegistrationSchema = studentProfileSchema.extend({
  email: z.string().trim().toLowerCase().email("Email sinh viên không hợp lệ.")
    .refine((email) => studentIdFromDntuEmail(email) !== null,
      "Chỉ cho phép email sinh viên dạng MSSV@dntu.edu.vn."),
  password: z.string().min(12, "Mật khẩu phải có ít nhất 12 ký tự.").max(128)
    .regex(/[A-Za-z]/, "Mật khẩu cần có chữ.")
    .regex(/\d/, "Mật khẩu cần có số."),
  confirmPassword: z.string().min(1),
}).refine((value) => !validatePassword(value.password, { email: value.email, studentId: studentIdFromDntuEmail(value.email) }), {
  path: ["password"],
  message: "Mật khẩu yếu hoặc chứa thông tin định danh.",
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Mật khẩu xác nhận không khớp.",
});

export type StudentProfileInput = z.infer<typeof studentProfileSchema>;

export function studentProfileComplete(profile: {
  role: string;
  submission_scope: string;
  email: string;
  full_name?: string | null;
  branch_code?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  profile_completed_at?: string | null;
}) {
  if (profile.role !== "submitter" || profile.submission_scope !== "individual") return true;
  if (!studentIdFromDntuEmail(profile.email) || !profile.profile_completed_at) return false;
  return studentProfileSchema.safeParse({
    fullName: profile.full_name || "",
    branchCode: profile.branch_code || "",
    phone: profile.phone || "",
    birthDate: profile.birth_date || "",
  }).success;
}
