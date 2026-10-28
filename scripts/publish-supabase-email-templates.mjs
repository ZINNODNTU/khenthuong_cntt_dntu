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
  const expected = `href="https://khenthuong-cntt-dntu.vercel.app/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${template.type}"`;
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
  const current = await request("GET");
  const expectedSite = "https://khenthuong-cntt-dntu.vercel.app";
  // Preserve any existing redirects, including valid previews and other clients.
  const requiredRedirects = [
    `${expectedSite}/auth/finish`,
    `${expectedSite}/auth/finish?mode=recovery`,
  ];
  const currentRedirects = typeof current.uri_allow_list === "string"
    ? current.uri_allow_list.split(",").map(value => value.trim()).filter(Boolean)
    : [];
  const mergedRedirects = [...new Set([...currentRedirects, ...requiredRedirects])];
  const siteIsCorrect = (current.site_url || "").replace(/\/$/, "") === expectedSite;
  const redirectsAreCorrect = requiredRedirects.every(value => currentRedirects.includes(value));
  if (operation === "apply") {
    const payload = { ...body };
    if (!siteIsCorrect) payload.site_url = expectedSite;
    if (!redirectsAreCorrect) payload.uri_allow_list = mergedRedirects.join(",");
    await request("PATCH", payload);
    console.log(`Published auth templates and synchronized production URL configuration for project ${projectRef}.`);
  }
  const published = operation === "apply" ? await request("GET") : current;
  const mismatched = Object.keys(body).filter(key => published[key] !== body[key]);
  const validSite = (published.site_url || "").replace(/\/$/, "") === expectedSite;
  const validRedirects = requiredRedirects.every(value => (
    typeof published.uri_allow_list === "string" &&
    published.uri_allow_list.split(",").map(entry => entry.trim()).includes(value)
  ));
  console.log(`Remote auth templates: ${mismatched.length ? "NOT SYNCHRONIZED" : "MATCH LOCAL FILES"}.`);
  console.log(`Production Site URL: ${validSite ? "CORRECT" : "INCORRECT"}; redirect allow list: ${validRedirects ? "CORRECT" : "INCOMPLETE"}.`);
  console.log(`Confirm email: ${published.mailer_autoconfirm === false ? "REQUIRED" : "verify setting manually"}.`);
  const smtpFields = ["smtp_host", "smtp_port", "smtp_user", "smtp_admin_email"];
  console.log(`SMTP configuration visibility: ${smtpFields.every(field => Boolean(published[field])) ? "essential fields present" : "at least one field not exposed or unset"}; delivery is NOT proven.`);
  if (mismatched.length || !validSite || !validRedirects) {
    console.error("Auth email configuration is not ready for production.");
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Unable to inspect/update Auth config: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
}