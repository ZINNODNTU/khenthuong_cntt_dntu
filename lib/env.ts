function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name}`);
  return value;
}
function requiredOne(names: string[]): string {
  for (const name of names) if (process.env[name]) return process.env[name]!;
  throw new Error(`Thiếu biến môi trường ${names.join(" hoặc ")}`);
}
function enabled(name: string, fallback = true): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return !["0", "false", "off", "no"].includes(value.toLowerCase());
}
export const env = {
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: () => required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseServiceRoleKey: () => requiredOne(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]),
  googleAppsScriptWebAppUrl: () => required("GOOGLE_APPS_SCRIPT_WEB_APP_URL"),
  googleAppsScriptSharedSecret: () => required("GOOGLE_APPS_SCRIPT_SHARED_SECRET"),
  maxImageSizeMb: () => Number(process.env.MAX_IMAGE_SIZE_MB || "4"),
  reviewerDomain: () => (process.env.ALLOWED_REVIEWER_DOMAIN || "dntu.edu.vn").toLowerCase(),
  publicSignupEnabled: () => enabled("PUBLIC_SIGNUP_ENABLED", process.env.NODE_ENV !== "production"),
  authEmailSenderAddress: () => process.env.NEXT_PUBLIC_AUTH_EMAIL_SENDER_ADDRESS || "",
};
