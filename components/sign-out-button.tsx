"use client";

import { LogOut } from "lucide-react";

export function SignOutButton() {
  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      className="btn workspace-signout-button"
      aria-label="Đăng xuất khỏi hệ thống"
      title="Đăng xuất"
      onClick={signOut}
    >
      <LogOut size={16} />
      <span>Đăng xuất</span>
    </button>
  );
}
