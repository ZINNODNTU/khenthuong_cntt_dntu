import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let failed = false;

function fail(message) {
  failed = true;
  console.error(`STUDENT ACCOUNT VERIFY FAILED: ${message}`);
}

const required = [
  "app/api/auth/register/route.ts",
  "supabase/hotfix/PREVENT_DUPLICATE_STUDENT_ACCOUNTS.sql",
  "scripts/audit-duplicate-student-accounts.mjs",
];

for (const file of required) {
  if (!existsSync(resolve(process.cwd(), file))) {
    fail(`Missing ${file}`);
  }
}

const registerRoute = readFileSync(
  resolve(process.cwd(), "app/api/auth/register/route.ts"),
  "utf8",
);

for (const token of [
  "student_account_registry",
  "publicStudentRegistrationSchema",
  "isObfuscatedExistingUser",
  "status: 409",
  "auth.signUp",
]) {
  if (!registerRoute.includes(token)) {
    fail(`Register route is missing ${token}`);
  }
}

const registerForm = readFileSync(
  resolve(process.cwd(), "components/register-form.tsx"),
  "utf8",
);

if (!registerForm.includes('fetch("/api/auth/register"')) {
  fail("Registration is still performed directly in the browser.");
}

if (registerForm.includes("client.auth.signUp")) {
  fail("Browser registration still calls Supabase signUp directly.");
}

const setup = readFileSync(
  resolve(process.cwd(), "supabase/database/01_SETUP_DATABASE.sql"),
  "utf8",
);

for (const token of [
  "create table public.student_account_registry",
  "profiles_email_lower_unique",
  "STUDENT_ACCOUNT_ALREADY_EXISTS",
  "on_auth_user_student_registry_confirmed",
]) {
  if (!setup.includes(token)) {
    fail(`Database setup is missing ${token}`);
  }
}

if (!failed) {
  console.log("Student account uniqueness verification: PASS");
}

process.exitCode = failed ? 1 : 0;
