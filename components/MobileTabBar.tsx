"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User as UserIcon } from "lucide-react";
import { useStoredUser } from "@/lib/client/user";
import { NAV_ITEMS } from "./nav";

export default function MobileTabBar() {
  const pathname = usePathname();
  const user = useStoredUser();

  const items = [
    ...NAV_ITEMS,
    {
      href: user ? `/profile/${user.id}` : "/login",
      label: "プロフィール",
      icon: UserIcon,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-paper/90 backdrop-blur border-t border-line flex">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={label}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
            aria-label={label}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 2}
              className={active ? "text-growth" : "text-ink/35"}
            />
          </Link>
        );
      })}
    </nav>
  );
}
