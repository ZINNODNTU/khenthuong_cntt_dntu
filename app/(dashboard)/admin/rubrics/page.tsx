import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

// Numeric scoring is retired; award review now uses evidence-only binary decisions.
export default async function RubricsPage() {
  await requireRole(["admin"]);
  redirect("/criteria");
}
