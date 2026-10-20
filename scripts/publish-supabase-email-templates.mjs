/**
 * Publish the two maintained Supabase Auth email templates.
 *
 * Usage:
 *   node scripts/publish-supabase-email-templates.mjs --check
 *   node scripts/publish-supabase-email-templates.mjs --apply --project-ref nzoamsyazdafyqnsxkny
 *
 * Only --apply makes a remote change. SUPABASE_ACCESS_TOKEN must be provided
 * as a process environment variable, never stored in the repository.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const applied = args.includes("--apply");
const refIndex = args.indexOf("--project-ref");
const projectRef = refIndex >= 0 ? args[refIndex + 1] : "";
if (args.some((arg, i) => !["--apply", "--check", "--project-ref"].includes(arg) && (refIndex < 0 || i !== refIndex + 1)) ||
    (refIndex >= 0 && (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef)))) {
  console.error("Usage: node scripts/publish-supabase-email-templates.mjs [--check | --apply --project-ref <ref>]");
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
      /<script\\b|<img\\b|http:\/\//i.test(html)) {
    console.error(`Template ${template.name} did not pass preflight checks.`);
    process.exit(1);
  }
  body[`mailer_subjects_${template.name}`] = subject;
  body[`mailer_templates_${template.name}_content`] = html;
}
console.log("Email templates: confirmation and recovery validated.");
if (!applied) {
  console.log("Dry run only; Supabase was not modified. Use --apply --project-ref <ref> to publish.");
  process.exit(0);
}
if (!projectRef) {
  console.error("An explicit --project-ref is required for production changes.");
  process.exit(2);
}
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN is not set; no production changes were made.");
  process.exit(2);
}
try {
  const result = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!result.ok) {
    console.error(`Supabase Management API returned HTTP ${result.status}; no success is assumed. Check token permissions (auth_config_write/project_admin_write) and project ref.`);
    process.exit(1);
  }
  console.log(`Published confirmation and recovery Auth email templates to project ${projectRef}. No SMTP settings were changed.`);
} catch (error) {
  console.error(`Could not reach Supabase Management API (${error?.name || "request failed"}).`);
  process.exit(1);
}
