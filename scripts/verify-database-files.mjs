import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message) {
  console.error(`DATABASE VERIFY FAILED: ${message}`);
  process.exitCode = 1;
}

const resetFile = resolve(
  process.cwd(),
  "supabase/database/00_RESET_DATABASE.sql",
);

const setupFile = resolve(
  process.cwd(),
  "supabase/database/01_SETUP_DATABASE.sql",
);

const criteriaFile = resolve(
  process.cwd(),
  "supabase/database/02_CRITERIA_9.sql",
);

const workflowFile = resolve(process.cwd(), "supabase/database/03_REVIEW_WORKFLOW.sql");
const scoringFile = resolve(process.cwd(), "supabase/database/04_AWARD_SCORING.sql");

if (!existsSync(resetFile)) fail("Missing 00_RESET_DATABASE.sql");
if (!existsSync(setupFile)) fail("Missing 01_SETUP_DATABASE.sql");
if (!existsSync(criteriaFile)) fail("Missing 02_CRITERIA_9.sql");
if (!existsSync(workflowFile)) fail("Missing 03_REVIEW_WORKFLOW.sql");
if (!existsSync(scoringFile)) fail("Missing 04_AWARD_SCORING.sql");

// Verify the deployed CLI migrations match the maintained source SQL.
for (const [source, filename] of [
  [setupFile, "20261008140001_initial_award_schema.sql"],
  [criteriaFile, "20261008140002_criteria_nine.sql"],
  [workflowFile, "20261008140003_review_workflow.sql"],
  [scoringFile, "20261008140004_award_scoring.sql"],
  [resolve(process.cwd(), "supabase/database/07_EVIDENCE_ENTRIES.sql"), "20261009100000_evidence_entries.sql"],
  [resolve(process.cwd(), "supabase/database/08_COLLECTIVE_CRITERIA_T.sql"), "20261009110000_collective_criteria_t_codes.sql"],
    [resolve(process.cwd(), "supabase/database/09_EVIDENCE_CONTENT_INTEGRITY.sql"), "20261009120000_evidence_content_integrity.sql"],
]) {
  const target = resolve(process.cwd(), "supabase/migrations", filename);
  if (!existsSync(target)) {
    fail(`Missing Supabase CLI migration: ${filename}`);
  } else if (existsSync(source) && readFileSync(source, "utf8") !== readFileSync(target, "utf8")) {
    fail(`Supabase CLI migration differs from source: ${filename}`);
  }
}

const installerFile = resolve(process.cwd(), "supabase/database/INSTALL_NEW_PROJECT.sql");
if (!existsSync(installerFile)) {
  fail("Missing INSTALL_NEW_PROJECT.sql");
} else {
  const installer = readFileSync(installerFile, "utf8");
  for (const marker of [
    "BEGIN 06_SECURITY_HARDENING.sql",
    "BEGIN 07_EVIDENCE_ENTRIES.sql",
    "BEGIN 08_COLLECTIVE_CRITERIA_T.sql",
    "BEGIN 09_EVIDENCE_CONTENT_INTEGRITY.sql",
    "evidences_content_sha256_check",
  ]) {
    if (!installer.includes(marker)) fail("New-project installer missing " + marker);
  }
  if (installer.includes("BEGIN 00_RESET_DATABASE.sql")) {
    fail("The non-destructive installer must NEVER contain reset SQL");
  }
}

if (existsSync(resetFile)) {
  const reset = readFileSync(resetFile, "utf8");

  for (const token of [
    "drop schema if exists public cascade",
    "delete from auth.users",
    "create schema public",
  ]) {
    if (!reset.includes(token)) {
      fail(`Reset file is missing: ${token}`);
    }
  }
}

if (existsSync(setupFile)) {
  const setup = readFileSync(setupFile, "utf8");
  const criteria = readFileSync(criteriaFile, "utf8");
  const workflow = existsSync(workflowFile) ? readFileSync(workflowFile, "utf8") : "";
  const scoring = existsSync(scoringFile) ? readFileSync(scoringFile, "utf8") : "";

  for (const token of [
    "create table public.profiles",
    "create table public.evaluation_periods",
    "create table public.applications",
    "create table public.evidences",
    "applications_one_individual_per_period",
    "applications_one_branch_per_period",
    "applications_one_club_per_period",
    "validate_evidence_parent",
    "enable row level security",
    "on_auth_user_created",
    "must_change_password",
    "account_email_policy",
    "applications_individual_identity_check",
  ]) {
    if (!setup.includes(token)) {
      fail(`Setup file is missing: ${token}`);
    }
  }

  for (const token of ["create table if not exists public.application_criteria", "C1", "C9", "verify_application_criterion", "enable row level security", "revoke all on table public.application_criteria", "guard_passed_application_criteria", "reset_application_criteria_on_resubmit"]) {
    if (!criteria.includes(token)) fail(`Criteria file is missing: ${token}`);
  }

  for (const token of [
    "create table if not exists public.criterion_review_history",
    "create table if not exists public.review_action_permits",
    "review_assigned_criterion",
    "assign_application_review",
    "record_application_decision",
    "guard_review_change_to_rpc",
    "guard_criterion_snapshot",
    "revoke insert, update, delete on public.review_history",
    "criteria_snapshot jsonb",
  ]) {
    if (!workflow.includes(token)) fail(`Review workflow file is missing: ${token}`);
  }

  for (const token of [
    "create table if not exists public.award_rubrics",
    "create table if not exists public.award_score_entries",
    "create table if not exists public.award_score_history",
    "configure_award_rubric",
    "score_award_criterion",
    "guard_award_score_decision",
    "snapshot_award_score_decision",
    "revoke all on public.award_score_entries",
  ]) {
    if (!scoring.includes(token)) fail(`Scoring file is missing: ${token}`);
  }

  const branchCount = (
    setup.match(/\('(?:22|23|24|25)[A-Z0-9]+',\s*'(?:22|23|24|25)[A-Z0-9]+'\)/g)
    ?? []
  ).length;

  if (branchCount !== 19) {
    fail(`Expected 19 default branches, found ${branchCount}.`);
  }


  const allowBranchColumnCount = (
    setup.match(/allow_branch_collective boolean/g) ?? []
  ).length;

  if (allowBranchColumnCount !== 1) {
    fail(
      `Expected one allow_branch_collective column, found ${allowBranchColumnCount}.`,
    );
  }

  if (
    setup.includes(
      "returns trigger\nreturns trigger",
    )
  ) {
    fail("Duplicate returns trigger declaration found.");
  }
}

if (!process.exitCode) {
  console.log("Database reset/setup verification: PASS");
}
