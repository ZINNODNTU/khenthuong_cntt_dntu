import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/lib/types";

export type NavItem = { href: string; label: string; description: string; icon: LucideIcon; badge?: string };
export type NavGroup = { label: string; items: NavItem[] };
export type { UserRole };
