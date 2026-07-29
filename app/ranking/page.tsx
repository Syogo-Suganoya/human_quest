"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";

type RankingRow = {
  id: number;
  nickname: string;
  total_xp: string | number;
  level: string | number;
  post_count: string | number;
  active_days: string | number;
  quest_count: string | number;
};

export default function RankingPage() {
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ranking")
      .then((res) => res.json())
      .then((data) => {
        if (data.ranking) setRows(data.ranking);
        else setError(data.error ?? "ランキングの取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="sticky top-0 bg-paper/90 backdrop-blur border-b border-line px-4 py-3 z-10">
        <h1 className="font-display font-bold text-lg">ランキング</h1>
      </div>

      {loading && <p className="p-4 text-muted">読み込み中...</p>}
      {error && <p className="p-4 text-red-600">{error}</p>}

      <div className="divide-y divide-line">
        {rows.map((row, i) => (
          <Link
            key={row.id}
            href={`/profile/${row.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-paper-warm transition-colors"
          >
            <span
              className={`w-6 text-center text-[13px] font-display font-bold ${
                i < 3 ? "text-ember-dark" : "text-muted/70"
              }`}
            >
              {i + 1}
            </span>
            <Avatar nickname={row.nickname} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px] truncate">{row.nickname}</p>
              <p className="text-[13px] text-muted">
                Lv.{row.level} · 投稿{row.post_count}回 · 活動{row.active_days}日
              </p>
            </div>
            <span className="font-display font-bold text-growth-dark text-[15px] whitespace-nowrap">
              {row.total_xp} XP
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
