import {
  existsSync,
  readFileSync,
} from "node:fs";
import { resolve } from "node:path";

let failed = false;

function fail(message) {
  failed = true;
  console.error(`LOGIN SMTP VERIFY FAILED: ${message}`);
}

const requiredFiles = [
  "components/login-screen.tsx",
  "app/auth/confirm/route.ts",
  "app/forgot-password/page.tsx",
  "app/reset-password/page.tsx",
  "components/reset-password-form.tsx",
  "supabase/email-templates/recovery.html",
  "supabase/email-templates/recovery-subject.txt",
  "supabase/email-templates/confirm-signup.html",
  "supabase/email-templates/confirm-signup-subject.txt",
  "docs/CUSTOM_SMTP_CONFIRMATION_EMAIL.md",
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(process.cwd(), file))) {
    fail(`Missing ${file}`);
  }
}

const rootPage = readFileSync(
  resolve(process.cwd(), "app/page.tsx"),
  "utf8",
);

if (!rootPage.includes("<LoginScreen")) {
  fail("Root page does not render LoginScreen.");
}

const proxy = readFileSync(
  resolve(process.cwd(), "lib/supabase/proxy.ts"),
  "utf8",
);

for (const token of [
  'pathname === "/"',
  'new URL("/", request.url)',
  '"next"',
]) {
  if (!proxy.includes(token)) {
    fail(`Proxy is missing ${token}`);
  }
}

const confirmRoute = readFileSync(
  resolve(process.cwd(), "app/auth/confirm/route.ts"),
  "utf8",
);

for (const token of [
  "token_hash",
  "verifyOtp",
  "EmailOtpType",
]) {
  if (!confirmRoute.includes(token)) {
    fail(`Confirm route is missing ${token}`);
  }
}

const emailTemplate = readFileSync(
  resolve(
    process.cwd(),
    "supabase/email-templates/confirm-signup.html",
  ),
  "utf8",
);

if (
  !emailTemplate.includes(
    "{{ .ConfirmationURL }}",
  )
) {
  fail("Confirmation template has an invalid confirmation URL.");
}

const recoveryTemplate = readFileSync(
  resolve(process.cwd(), "supabase/email-templates/recovery.html"),
  "utf8",
);
if (
  !recoveryTemplate.includes("{{ .RedirectTo }}?token_hash={{ .TokenHash }}") ||
  !recoveryTemplate.includes("type=recovery")
) {
  fail("Recovery email must link to the configured redirect and use a recovery token hash.");
}
for (const [name, markup, buttonLabel] of [
  ["confirmation", emailTemplate, "XÁC NHẬN EMAIL"],
  ["recovery", recoveryTemplate, "THIẾT LẬP MẬT KHẨU MỚI"],
]) {
  if (!markup.includes('lang="vi"') || !markup.includes('role="presentation"')
    || !markup.includes("KHOA CÔNG NGHỆ THÔNG TIN")
    || !markup.includes("background-color:#173751")
    || !markup.includes(buttonLabel)) {
    fail(`${name} template is missing accessible DNTU styling or a clear action.`);
  }
  if (/<script\b|<img\b|http:\/\//i.test(markup)) {
    fail(`${name} template contains scripts, remote images, or insecure HTTP URLs.`);
  }
}

const forgotPage = readFileSync(
  resolve(process.cwd(), "app/forgot-password/page.tsx"),
  "utf8",
);
const resetForm = readFileSync(
  resolve(process.cwd(), "components/reset-password-form.tsx"),
  "utf8",
);
if (!forgotPage.includes("resetPasswordForEmail") || !resetForm.includes("auth.updateUser")) {
  fail("Password recovery request/update flow is incomplete.");
}

const registerForm = readFileSync(
  resolve(process.cwd(), "components/register-form.tsx"),
  "utf8",
);

if (!registerForm.includes("senderAddress")) {
  fail("Register form is missing senderAddress");
}

const registerRoute = readFileSync(
  resolve(process.cwd(), "app/api/auth/register/route.ts"),
  "utf8",
);

for (const token of [
  'enforceRateLimit("register:ip"',
  'enforceRateLimit("register:email"',
  'new URL("/auth/finish", env.appUrl())',
  "auth.auth.signUp",
  "requiresConfirmation: true",
]) {
  if (!registerRoute.includes(token)) {
    fail(`Register route is missing ${token}`);
  }
}

if (!failed) {
  console.log("Login-first and custom SMTP verification: PASS");
}

process.exitCode = failed ? 1 : 0;