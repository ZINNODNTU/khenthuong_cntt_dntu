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
    "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}",
  )
) {
  fail("Confirmation template has an invalid confirmation URL.");
}

const registerForm = readFileSync(
  resolve(process.cwd(), "components/register-form.tsx"),
  "utf8",
);

for (const token of [
  "senderAddress",
  "email rate limit",
  "/auth/confirm?next=/",
]) {
  if (!registerForm.includes(token)) {
    fail(`Register form is missing ${token}`);
  }
}

if (!failed) {
  console.log("Login-first and custom SMTP verification: PASS");
}

process.exitCode = failed ? 1 : 0;
