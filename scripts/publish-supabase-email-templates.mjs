/**
 * Validate and publish Supabase Auth email templates without exposing credentials.
 *
 * pnpm run auth:templates:check                   # Local only
 * node scripts/publish-supabase-email-templates.mjs --verify-remote --project-ref <20-char ref>
 * node scripts/publish-supabase-email-templates.mjs --apply --project-ref <20-char ref>
 *
 * Remote modes require SUPABASE_ACCESS_TOKEN in the process environment.
 * Only confirmation/recovery template subject and HTML are ever modified.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const operation = args.includes("--apply") ? "apply" : args.includes("--verify-remote") ? "verify-remote" : "check";
const options = ["--apply", "--verify-remote", "--check"].filter(option => args.includes(option));
const refIndex = args.indexOf("--project-ref");
const projectRef = refIndex >= 0 ? args[refIndex + 1] : "";
const validArgs = args.every((arg, index) =>
  ["--check", "--apply", "--verify-remote", "--project-ref"].includes(arg) ||
  (index === refIndex + 1 && /^[a-z0-9]{20}$/.test(arg)));
if (!validArgs || options.length > 1 ||
    (refIndex >= 0 && !/^[a-z0-9]{20}$/.test(projectRef)) ||
    (operation !== "check" && !projectRef)) {
  console.error("Usage: node scripts/publish-supabase-email-templates.mjs --check | (--verify-remote | --apply) --project-ref <ref>");
  process.exit(2);
}

const templates = [
  { name: "confirmation", subject: "confirm-signup-subject.txt", html: "confirm-signup.html", type: "email" },
  { name: "recovery", subject: "recovery-subject.txt", html: "recovery.html", type: "recovery" },
];
const body = {};
for (const template of templates) {
  const root = resolve("supabase", "email-templates");
  const subject = readFileSync(resolve(root, template.subject), "utf8").trim();
  const html = readFileSync(resolve(root, template.html), "utf8");
  const expected = `href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${template.type}"`;
  if (!subject || subject.length > 180 || !html.includes(expected) ||
      !html.includes('lang="vi"') || !html.includes('role="presentation"') ||
      /<script\b|<img\b|http:\/\//i.test(html)) {
    console.error(`Template ${template.name} did not pass preflight checks.`);
    process.exit(1);
  }
  body[`mailer_subjects_${template.name}`] = subject;
  body[`mailer_templates_${template.name}_content`] = html;
}
console.log("Validated local confirmation and recovery templates; no secrets printed.");
if (operation === "check") {
  console.log("Read-only local check complete. Supabase cloud settings are not checked.");
  process.exit(0);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN is not configured in this process; no remote changes were made.");
  process.exit(2);
}
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

async function request(method, payload) {
  const response = await fetch(endpoint, {
    method,
    headers: payload ? { ...headers, "Content-Type": "application/json" } : headers,
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Management API returned HTTP ${response.status}; inspect permissions/project reference in Supabase Dashboard.`);
  }
  return response.json().catch(() => ({}));
}

try {
  // Verify the project Site URL before updating links that use {{ .SiteURL }}.
  const current = await request("GET");
  const expectedSite = "https://khenthuong-cntt-dntu.vercel.app";
  if ((current.site_url || "").replace(/\/$/, "") !== expectedSite) {
    console.error("Site URL does not match the production domain. Update Authentication → URL Configuration first. No templates were changed.");
    process.exit(1);
  }
  if (operation === "apply") {
    await request("PATCH", body);
    console.log(`Published only confirmation/recovery HTML + subjects for project ${projectRef}.`);
  }
  const published = operation === "apply" ? await request("GET") : current;
  const mismatched = Object.keys(body).filter(key => published[key] !== body[key]);
  console.log(`Remote auth templates: ${mismatched.length ? "NOT SYNCHRONIZED" : "MATCH LOCAL FILES"}.`);
  console.log(`Site URL: production domain verified. Confirm email: ${published.mailer_autoconfirm === false ? "REQUIRED" : "verify setting manually"}.`);
  const smtpFields = ["smtp_host", "smtp_port", "smtp_user", "smtp_admin_email"];
  console.log(`SMTP configuration visibility: ${smtpFields.every(field => Boolean(published[field])) ? "essential fields present" : "at least one field not exposed or unset"}; delivery is NOT proven.`);
  if (mismatched.length) {
    console.error(`Mismatched template fields: ${mismatched.join(", ")}.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Unable to inspect/update Auth config: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
}
