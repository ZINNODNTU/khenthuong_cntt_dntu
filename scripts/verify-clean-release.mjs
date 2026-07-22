import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
let failed = false;

function fail(message) {
  failed = true;
  console.error(`VERIFY FAILED: ${message}`);
}

function walk(directory) {
  const output = [];

  for (const name of readdirSync(directory)) {
    if (["node_modules", ".next", ".git", ".vercel"].includes(name)) {
      continue;
    }

    const path = join(directory, name);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      output.push(...walk(path));
    } else {
      output.push(path);
    }
  }

  return output;
}

const required = [
  "supabase/database/00_RESET_DATABASE.sql",
  "supabase/database/01_SETUP_DATABASE.sql",
  "supabase/functions/bootstrap-admin/index.ts",
  "CREATE_INITIAL_ADMIN.ps1",
  "CREATE_INITIAL_ADMIN.bat",
  "app/(dashboard)/periods/page.tsx",
  "app/(dashboard)/clubs/page.tsx",
  "app/(dashboard)/admin/users/page.tsx",
  "app/api/evidence/upload/route.ts",
];

for (const file of required) {
  if (!existsSync(resolve(root, file))) {
    fail(`Missing required file: ${file}`);
  }
}

const forbidden = [
  "supabase/migrations",
  "supabase/functions/create-system-user",
  "CREATE_USER_SUPABASE_CLI.ps1",
  "CREATE_REVIEWER_SUPABASE_CLI.bat",
  "components/set-password-form.tsx",
  "app/(auth)/set-password/page.tsx",
];

for (const file of forbidden) {
  if (existsSync(resolve(root, file))) {
    fail(`Legacy file still exists: ${file}`);
  }
}

const textFiles = walk(root).filter((file) =>
  /\.(ts|tsx|js|mjs|md|json|sql|ps1|bat|toml|env|example)$/.test(file),
);

for (const file of textFiles) {
  if (file.endsWith("verify-clean-release.mjs")) continue;
  const text = readFileSync(file, "utf8");

  for (const legacy of [
    "001_initial_schema.sql",
    "002_dynamic_branches_public_evidence.sql",
    "003_secure_signup_email_auth.sql",
    "004_role_portals_portrait_security.sql",
    "005_periods_clubs_single_submission_accounts.sql",
    "signInWithOAuth",
    "NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED",
  ]) {
    if (text.includes(legacy)) {
      fail(`Legacy reference "${legacy}" in ${file.replace(root, "")}`);
    }
  }
}

const submitRoute = readFileSync(
  resolve(root, "app/api/applications/[id]/route.ts"),
  "utf8",
);

for (const forbiddenAssignment of [
  "values.submitted_at",
  "values.reviewer_id",
  "values.decided_at",
]) {
  if (submitRoute.includes(forbiddenAssignment)) {
    fail(`Submit route still sets protected field: ${forbiddenAssignment}`);
  }
}

if (!failed) {
  console.log("Clean release verification: PASS");
}

process.exitCode = failed ? 1 : 0;


const v161Required = [
  "public/brand/doan-logo.png",
  "app/401/page.tsx",
  "app/403/page.tsx",
  "app/500/page.tsx",
  "app/not-found.tsx",
  "app/error.tsx",
  "app/global-error.tsx",
  "components/brand-logo.tsx",
  "components/system-error-view.tsx",
];

for (const file of v161Required) {
  if (!existsSync(resolve(root, file))) {
    fail(`Missing required v1.0.0 file: ${file}`);
  }
}

const proxySource = readFileSync(
  resolve(root, "lib/supabase/proxy.ts"),
  "utf8",
);

if (proxySource.includes('user && (path === "/login"')) {
  fail("Legacy authenticated /login redirect still exists.");
}

if (!proxySource.includes('code: "UNAUTHORIZED"')) {
  fail("API 401 JSON handling is missing.");
}

console.log("Redirect/error page verification: PASS");


const v170Required = [
  "lib/identity.ts",
  "lib/unit-accounts.ts",
  "app/change-password/page.tsx",
  "app/api/account/change-password/route.ts",
  "components/change-password-form.tsx",
  "docs/UNIT_ACCOUNTS_AND_STUDENT_ID.md",
];

for (const file of v170Required) {
  if (!existsSync(resolve(root, file))) {
    fail(`Missing required v1.0.0 file: ${file}`);
  }
}

const applicationRoute = readFileSync(
  resolve(root, "app/api/applications/route.ts"),
  "utf8",
);

if (!applicationRoute.includes("studentIdFromDntuEmail")) {
  fail("Application API does not derive MSSV from authenticated email.");
}

for (const forbiddenIdentityField of [
  "payload.studentId",
  "payload.email",
]) {
  if (applicationRoute.includes(forbiddenIdentityField)) {
    fail(`Application API still trusts ${forbiddenIdentityField}.`);
  }
}

const applicationForm = readFileSync(
  resolve(root, "components/application-form.tsx"),
  "utf8",
);

if (applicationForm.includes('name="studentId"')) {
  fail("Student ID remains editable in the application form.");
}

const branchRoute = readFileSync(
  resolve(root, "app/api/admin/branches/route.ts"),
  "utf8",
);

const clubRoute = readFileSync(
  resolve(root, "app/api/admin/clubs/route.ts"),
  "utf8",
);

for (const [label, source] of [
  ["branch", branchRoute],
  ["club", clubRoute],
]) {
  if (!source.includes("provisionUnitAccount")) {
    fail(`${label} creation does not provision an account.`);
  }
}

const loginForm = readFileSync(
  resolve(root, "components/login-form.tsx"),
  "utf8",
);

if (!loginForm.includes("minLength={6}")) {
  fail("Login form does not accept the default 123456 password.");
}

console.log("MSSV/unit-account verification: PASS");


const identitySource = readFileSync(
  resolve(root, "lib/identity.ts"),
  "utf8",
);

for (const token of [
  'DEFAULT_UNIT_PASSWORD = "123456"',
  "studentIdFromDntuEmail",
  "loginEmailFromInput",
]) {
  if (!identitySource.includes(token)) {
    fail(`Identity helper is missing: ${token}`);
  }
}

const registerForm = readFileSync(
  resolve(root, "components/register-form.tsx"),
  "utf8",
);

if (!registerForm.includes('name="studentId"')) {
  fail("Registration does not collect MSSV directly.");
}

if (registerForm.includes('name="email"')) {
  fail("Registration still asks students to type the full email.");
}

if (!loginForm.includes("loginEmailFromInput")) {
  fail("Login does not accept MSSV or unit code shorthand.");
}

for (const apiFile of [
  "app/api/admin/branches/route.ts",
  "app/api/admin/clubs/route.ts",
  "app/api/admin/periods/route.ts",
  "app/api/admin/users/route.ts",
  "app/api/applications/route.ts",
  "app/api/applications/[id]/route.ts",
  "app/api/applications/[id]/decision/route.ts",
  "app/api/evidence/upload/route.ts",
]) {
  const source = readFileSync(resolve(root, apiFile), "utf8");
  if (!source.includes("must_change_password")) {
    fail(`Password-change API guard is missing: ${apiFile}`);
  }
}

console.log("Forced-password/API verification: PASS");
