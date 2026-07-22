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

if (!existsSync(resetFile)) fail("Missing 00_RESET_DATABASE.sql");
if (!existsSync(setupFile)) fail("Missing 01_SETUP_DATABASE.sql");

if (existsSync(resolve(process.cwd(), "supabase/migrations"))) {
  fail("Legacy supabase/migrations directory must not exist.");
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
