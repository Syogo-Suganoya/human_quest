"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { clearStoredUser, useStoredUser } from "@/lib/client/user";
import { NAV_ITEMS } from "./nav";
import Avatar from "./Avatar";

export default function Sidebar() {
  const pathname = usePathname();
  const user = useStoredUser();

  return (
    <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 border-r border-line px-3 py-4 h-screen sticky top-0">
      <Link href="/quest" className="flex items-center gap-2 px-3 py-2 mb-2">
        <span className="text-2xl">🔥</span>
        <span className="font-display font-bold text-lg">Human Quest</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-full text-[15px] transition-colors ${
                active
                  ? "font-bold text-ink bg-paper-warm"
                  : "text-ink/70 hover:bg-paper-warm"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
        {user && (
          <Link
            href={`/profile/${user.id}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-full text-[15px] transition-colors ${
              pathname === `/profile/${user.id}`
                ? "font-bold text-ink bg-paper-warm"
                : "text-ink/70 hover:bg-paper-warm"
            }`}
          >
            <UserIcon size={22} />
            プロフィール
          </Link>
        )}
      </nav>

      <div className="mt-auto">
        {user ? (
          <button
            onClick={() => {
              clearStoredUser();
              window.location.href = "/login";
            }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-full text-ink/70 hover:bg-paper-warm"
          >
            <Avatar nickname={user.nickname} size="sm" />
            <span className="flex-1 text-left text-sm font-medium truncate">{user.nickname}</span>
            <LogOut size={18} />
          </button>
        ) : (
          <Link
            href="/login"
            className="block text-center rounded-full bg-growth text-white py-2 font-medium hover:bg-growth-dark"
          >
            ログイン
          </Link>
        )}
      </div>
    </aside>
  );
}
