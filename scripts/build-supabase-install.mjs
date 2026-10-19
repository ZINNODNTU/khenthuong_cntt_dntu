import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const parts = [
  "01_SETUP_DATABASE.sql",
  "02_CRITERIA_9.sql",
  "03_REVIEW_WORKFLOW.sql",
  "04_AWARD_SCORING.sql",
  "05_CRITERION_EVIDENCE_BINARY.sql",
  "06_SECURITY_HARDENING.sql",
  "07_EVIDENCE_ENTRIES.sql",
  "08_COLLECTIVE_CRITERIA_T.sql",
  "09_EVIDENCE_CONTENT_INTEGRITY.sql",
  "09A_INDIVIDUAL_ONLY.sql",
  "10_OPTIONAL_PERSONAL_COMMITMENT.sql",
];
const path = "supabase/database";
const blocks = [
  "-- CNTT Award Review: BO CAI DAT CHO SUPABASE PROJECT MOI (KHONG RESET DATA)",
  "-- CHI DANH CHO DATABASE CHUA CO SCHEMA CNTT; NEU DA CO TABLE/ENUM, DUNG TAI DAY.",
  "-- Chay trong Supabase Dashboard > SQL Editor bang tai khoan owner sau khi kiem tra to_regclass.",
  "-- SQL se thay doi schema public va tao auth triggers. Hay kiem tra backup truoc khi thi hanh.",
  "-- KHONG CO 00_RESET_DATABASE.sql TRONG FILE NAY.",
];
for (const name of parts) {
  const content = readFileSync(join(path, name), "utf8").trim();
  blocks.push(`\n-- ======================= BEGIN ${name} =======================\n`, content,
    `\n-- ======================== END ${name} ========================\n`);
}
const output = join(path, "INSTALL_NEW_PROJECT.sql");
writeFileSync(output, blocks.join("\n").trimEnd() + "\n", { encoding: "utf8" });
console.log(`Da tao ${output}; khong thuc thi SQL len Supabase.`);
