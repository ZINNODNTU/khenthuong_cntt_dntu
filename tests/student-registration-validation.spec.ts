import { expect, test } from "@playwright/test";
import { studentRegistrationSchema } from "../lib/student-onboarding";

const valid = {
  fullName: "Nguyen Test",
  email: "12345678@dntu.edu.vn",
  branchCode: "22DTH1",
  birthDate: "2000-01-01",
  phone: "0912345678",
  password: "SafeRandomPass8452!",
  confirmPassword: "SafeRandomPass8452!",
};

test.describe("Local registration input validation without database writes", () => {
  test("accepts syntactically valid student information", () => {
    expect(studentRegistrationSchema.safeParse(valid).success).toBe(true);
  });

  test("rejects emails outside DNTU even if the email address is syntactically valid", () => {
    const result = studentRegistrationSchema.safeParse({ ...valid, email: "student@other.edu.vn" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.message.includes("MSSV@dntu.edu.vn"))).toBe(true);
    }
  });

  test("rejects incomplete student personal information", () => {
    expect(studentRegistrationSchema.safeParse({
      ...valid, fullName: "", birthDate: "", branchCode: "", phone: "",
    }).success).toBe(false);
  });

  test("rejects bad birthdates, mismatched confirmation and passwords containing student ID", () => {
    expect(studentRegistrationSchema.safeParse({ ...valid, birthDate: "2000-02-30" }).success).toBe(false);
    expect(studentRegistrationSchema.safeParse({ ...valid, confirmPassword: "different-password" }).success).toBe(false);
    expect(studentRegistrationSchema.safeParse({
      ...valid, password: "Hi12345678World!", confirmPassword: "Hi12345678World!",
    }).success).toBe(false);
  });
});
