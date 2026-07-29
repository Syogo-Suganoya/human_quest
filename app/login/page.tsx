"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setStoredUser } from "@/lib/client/user";

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ログインに失敗しました");
        return;
      }
      setStoredUser(data.user);
      router.push("/quest");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-ember-soft flex items-center justify-center text-3xl mb-5">
        🔥
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-1.5">
        Human Questへようこそ
      </h1>
      <p className="text-[15px] text-muted mb-7 leading-relaxed">
        ニックネームを入力するだけで始められます。今日の課題から、現実世界での一歩を踏み出そう。
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="ニックネーム"
          maxLength={30}
          required
          className="w-full rounded-2xl border border-line bg-paper-warm px-4 py-3.5 text-[15px] outline-none focus:border-growth focus:ring-2 focus:ring-growth/20 transition-colors"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-growth hover:bg-growth-dark text-white py-3.5 font-bold text-[15px] disabled:opacity-50 transition-colors"
        >
          {loading ? "処理中..." : "はじめる"}
        </button>
      </form>
      <p className="text-[13px] text-muted mt-4">※ デモ用の簡易ログインです（パスワード不要）</p>
    </div>
  );
}
