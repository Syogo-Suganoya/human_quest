"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    // ランディングページはアプリのシェル(サイドバー/タブバー)を表示しない
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-5xl flex">
      <Sidebar />
      <main className="flex-1 min-w-0 max-w-xl w-full border-r border-line pb-16 md:pb-0">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}
