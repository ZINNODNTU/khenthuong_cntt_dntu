import { clsx, type ClassValue } from "clsx";
export function cn(...inputs: ClassValue[]) { return clsx(inputs); }
export function formatDate(value?: string | null) {
    if (!value)
        return "—";
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: value.includes("T") ? "short" : undefined }).format(new Date(value));
}
export function safeFileName(name: string) {
    return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120);
}

