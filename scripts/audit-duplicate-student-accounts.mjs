import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(file) {
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const secret =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  console.error(
    "Thiếu NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const users = [];

for (let page = 1; page <= 100; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage: 1000,
  });

  if (error) throw error;
  users.push(...data.users);

  if (data.users.length < 1000) break;
}

const groups = new Map();

for (const user of users) {
  const email = user.email?.trim().toLowerCase();
  if (!email || !/^\d+@dntu\.edu\.vn$/.test(email)) continue;

  const group = groups.get(email) || [];
  group.push(user);
  groups.set(email, group);
}

const duplicates = [...groups.entries()].filter(
  ([, items]) => items.length > 1,
);

if (!duplicates.length) {
  console.log("Không phát hiện tài khoản Auth trùng MSSV/email.");
  process.exit(0);
}

console.log(`Phát hiện ${duplicates.length} MSSV/email bị trùng:\n`);

for (const [email, items] of duplicates) {
  console.log(email);

  for (const user of items.sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  )) {
    console.log(
      `  - ${user.id} | created=${user.created_at} | confirmed=${user.email_confirmed_at || "NO"}`,
    );
  }
}

console.log(
  "\nScript chỉ kiểm tra và không tự xóa dữ liệu. Hãy giữ tài khoản có hồ sơ/nghiệp vụ và xử lý bản ghi thừa sau khi đối chiếu.",
);
process.exitCode = 2;
