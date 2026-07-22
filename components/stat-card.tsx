import type { LucideIcon } from "lucide-react";
export function StatCard({ label, value, note, icon: Icon }: {
    label: string;
    value: number;
    note: string;
    icon: LucideIcon;
}) { return <div className="card stat"><div className="stat-top"><span className="stat-label">{label}</span><span className="stat-icon"><Icon size={18}/></span></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>; }

