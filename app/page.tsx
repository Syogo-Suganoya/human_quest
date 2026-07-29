"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Footprints, Send, Sparkles, Gift } from "lucide-react";
import { useHydrated, useStoredUser } from "@/lib/client/user";

const CATEGORY_STYLE: Record<string, string> = {
  health: "bg-growth-soft text-growth-dark",
  community: "bg-sky-50 text-sky-700",
  relationship: "bg-rose-50 text-rose-700",
  learning: "bg-indigo-50 text-indigo-700",
  challenge: "bg-ember-soft text-ember-dark",
};

const SAMPLE_QUESTS = [
  { category: "health", label: "健康", title: "30分散歩する", photo: false },
  { category: "community", label: "地域", title: "商店街で買い物をする", photo: true },
  { category: "learning", label: "学習", title: "本を読む", photo: true },
  { category: "challenge", label: "挑戦", title: "初めての趣味に挑戦する", photo: false },
];

const STEPS = [
  { icon: Sparkles, title: "AIが課題を提示", body: "毎日、あなたの傾向に合わせてAIが複数の課題を用意します。" },
  { icon: Footprints, title: "現実世界で行動する", body: "気に入らない課題はリロールでき、あなたに合った挑戦を選べます。" },
  { icon: Send, title: "投稿してAIが応援", body: "写真・動画を投稿すると、AIコーチがフィードバックとXPを返します。" },
];

export default function LandingPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useStoredUser();

  useEffect(() => {
    if (hydrated && user) router.replace("/quest");
  }, [hydrated, user, router]);

  // localStorage を読む前と、ログイン済みで /quest へ遷移中は何も描画しない
  if (!hydrated || user) return null;

  return (
    <div className="min-h-screen">
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <span className="font-display font-bold text-lg">Human Quest</span>
        </div>
        <Link href="/login" className="text-sm text-muted hover:text-ink transition-colors">
          ログイン
        </Link>
      </header>

      {/* ヒーロー */}
      <section className="max-w-3xl mx-auto px-6 pt-10 pb-16 text-center">
        <span className="inline-block text-xs font-bold bg-ember-soft text-ember-dark rounded-full px-3 py-1 mb-5">
          AI時代の「人間力」を育てる行動SNS
        </span>
        <h1 className="font-display font-bold text-3xl md:text-4xl leading-snug tracking-tight mb-4">
          投稿より、行動。
        </h1>
        <p className="text-[15px] md:text-base text-muted leading-relaxed mb-8 max-w-xl mx-auto">
          AIが毎日テーマや課題を提示し、あなたが現実世界で行動する。その証拠を写真や動画で投稿すると、AIコーチが検証し、経験値やバッジ、称号を通して成長を後押しします。
        </p>
        <Link
          href="/quest"
          className="inline-block rounded-full bg-growth hover:bg-growth-dark text-white px-8 py-3.5 font-bold text-[15px] transition-colors"
        >
          はじめる
        </Link>
      </section>

      {/* コンセプト比較 */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 rounded-2xl border border-line overflow-hidden text-sm">
          <div className="px-5 py-4 border-r border-line">
            <p className="text-xs font-bold text-muted mb-2">従来SNS</p>
            <p className="text-ink/70">投稿 → 閲覧 → いいね</p>
          </div>
          <div className="px-5 py-4 bg-growth-soft">
            <p className="text-xs font-bold text-growth-dark mb-2">Human Quest</p>
            <p className="text-ink">AI課題 → 行動 → 投稿 → AI認証 → 成長</p>
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="font-display font-bold text-xl text-center mb-8">使い方</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl bg-paper-warm border border-line px-5 py-6">
              <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center mb-3 border border-line">
                <s.icon size={20} className="text-growth" />
              </div>
              <p className="text-xs font-bold text-muted mb-1">STEP {i + 1}</p>
              <p className="font-bold text-[15px] mb-1">{s.title}</p>
              <p className="text-[13px] text-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 課題サンプル */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="font-display font-bold text-xl text-center mb-2">今日の課題の例</h2>
        <p className="text-[13px] text-muted text-center mb-8">
          一部の課題は、証拠として写真での投稿が必須です。
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {SAMPLE_QUESTS.map((q) => (
            <div
              key={q.title}
              className="relative rounded-2xl border-2 border-dashed border-line bg-paper-warm px-5 py-5 overflow-hidden"
            >
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <span
                  className={`inline-block text-xs font-bold rounded-full px-2.5 py-1 ${CATEGORY_STYLE[q.category]}`}
                >
                  {q.label}
                </span>
                {q.photo && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-ember-soft text-ember-dark rounded-full px-2.5 py-1">
                    <Camera size={12} />
                    写真必須
                  </span>
                )}
              </div>
              <p className="font-display font-bold text-[16px]">{q.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 報酬 */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="font-display font-bold text-xl text-center mb-8">成長を後押しする報酬</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-line px-5 py-6">
            <p className="text-xs font-bold text-growth-dark mb-2">デジタル報酬（利用可能）</p>
            <p className="text-[15px] font-bold mb-1">経験値・レベル・バッジ・称号</p>
            <p className="text-[13px] text-muted leading-relaxed">
              課題を投稿するたびにXPを獲得し、レベルアップやバッジ獲得でコミュニティ内での成長が可視化されます。
            </p>
          </div>
          <div className="rounded-2xl border border-line px-5 py-6 relative">
            <span className="absolute top-5 right-5 inline-flex items-center gap-1 text-xs font-bold bg-sun/15 text-sun rounded-full px-2.5 py-1">
              <Gift size={12} />
              提供予定
            </span>
            <p className="text-xs font-bold text-sun mb-2">リアル報酬（今後追加予定）</p>
            <p className="text-[15px] font-bold mb-1">キャッシュバック・クーポン・地域ポイント</p>
            <p className="text-[13px] text-muted leading-relaxed">
              健康活動や地域活動、ボランティアなどをポイントに交換できる仕組みを、自治体・企業と連携して今後実装予定です。現バージョンでは未提供です。
            </p>
          </div>
        </div>
      </section>

      {/* 最終CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <p className="font-display font-bold text-xl mb-5">人が成長する時代へ。</p>
        <Link
          href="/quest"
          className="inline-block rounded-full bg-growth hover:bg-growth-dark text-white px-8 py-3.5 font-bold text-[15px] transition-colors"
        >
          今日の課題をはじめる
        </Link>
      </section>

      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        🔥 Human Quest — AIが成長する時代ではなく、人が成長する時代へ。
      </footer>
    </div>
  );
}
