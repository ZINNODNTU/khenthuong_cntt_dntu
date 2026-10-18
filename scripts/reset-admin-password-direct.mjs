// Local-only, one-account administrative password change.
// Never write a Supabase secret or plaintext password to repository files or logs.
import { createClient } from "@supabase/supabase-js";

const projectRef = "nzoamsyazdafyqnsxkny";
const userId = "3730eef1-9be4-442b-8d57-8dfea5b818f1";
const expectedEmail = "admin@dntu.edu.vn";
const secret = process.env.CNTT_RESET_SUPABASE_SECRET;
const newPassword = process.env.CNTT_RESET_ADMIN_PASSWORD;

function fail(message) {
  console.error("RESET_FAILED: " + message);
  process.exitCode = 1;
}
if (!secret || !newPassword) {
  fail("Missing locally supplied credentials. No account change attempted.");
} else {
  try {
    if (newPassword.length < 12) throw new Error("Password shorter than 12 characters.");
    const client = createClient(`https://${projectRef}.supabase.co`, secret, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data: current, error: getError } = await client.auth.admin.getUserById(userId);
    if (getError || !current?.user) {
      throw new Error("Could not verify target account using official Admin API.");
    }
    if (current.user.id !== userId || current.user.email?.toLowerCase() !== expectedEmail) {
      throw new Error("Account identity mismatch. No change made.");
    }
    const { data: profile, error: profileError } = await client.from("profiles")
      .select("role,is_active").eq("id", userId).single();
    if (profileError || profile?.role !== "admin" || !profile?.is_active) {
      throw new Error("Account is not verified as an active admin. No change made.");
    }
    const { data: updated, error: updateError } = await client.auth.admin.updateUserById(
      userId, { password: newPassword }
    );
    if (updateError || updated.user?.id !== userId) {
      throw new Error("Supabase Admin API rejected the password update.");
    }
    console.log("RESET_OK: Password updated using the official Supabase Admin API.");
    console.log("Verified account: " + expectedEmail);
    console.log("Project: " + projectRef);
    console.log("No email recovery was sent.");
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unknown error");
  }
}
