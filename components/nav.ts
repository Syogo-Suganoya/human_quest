import { Home, Rss, Trophy } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/quest", label: "今日の課題", icon: Home },
  { href: "/feed", label: "フィード", icon: Rss },
  { href: "/ranking", label: "ランキング", icon: Trophy },
] as const;
