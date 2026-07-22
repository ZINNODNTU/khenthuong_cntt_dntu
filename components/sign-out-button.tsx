"use client";
import { LogOut } from "lucide-react";
export function SignOutButton() { return <button className="btn" onClick={async () => { await fetch("/api/auth/signout", { method: "POST" }); location.href = "/login"; }}><LogOut size={15}/>Đăng xuất</button>; }

