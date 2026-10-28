import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

// Retired from the individual award workflow; historical records remain
// untouched in the database for audit integrity.
export default async function RetiredManagementPage() {
  await requireRole(["admin"]);
  redirect("/branches");
}
