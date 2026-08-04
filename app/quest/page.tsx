"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RotateCcw } from "lucide-react";
import { useHydrated, useStoredUser } from "@/lib/client/user";
import Avatar from "@/components/Avatar";

type Quest = {
  id: number;
  quest_catalog_id: number;
  category: string;
  title: string;
  description: string;
  required_media: "any" | "photo";
  completed: boolean;
};

type SubmitResult = {
  post: { ai_feedback: string; xp_awarded: number };
  newBadges: { code: string; title: string; description: string }[];
};

const CATEGORY_LABEL: Record<string, string> = {
  health: "健康",
  community: "地域",
  relationship: "人間関係",
  learning: "学習",
  challenge: "挑戦",
};

const CATEGORY_STYLE: Record<string, string> = {
  health: "bg-growth-soft text-growth-dark",
  community: "bg-sky-50 text-sky-700",
  relationship: "bg-rose-50 text-rose-700",
  learning: "bg-indigo-50 text-indigo-700",
  challenge: "bg-ember-soft text-ember-dark",
};

export default function QuestPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useStoredUser();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [activeComposerId, setActiveComposerId] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<number, SubmitResult>>({});
  const [rerollingId, setRerollingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hydrated && !user) router.push("/login");
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/quests/today?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.quests) setQuests(data.quests);
        else setListError(data.error ?? "課題の取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, [user]);

  function openComposer(id: number) {
    setActiveComposerId(id);
    setComment("");
    setFile(null);
    setPreviewUrl(null);
    setComposerError(null);
  }

  function closeComposer() {
    setActiveComposerId(null);
    setPreviewUrl(null);
  }

  function handleFileChange(f: File | null) {
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function handleReroll(questId: number) {
    if (!user) return;
    setRerollingId(questId);
    try {
      const res = await fetch(`/api/quests/${questId}/reroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? "リロールに失敗しました");
        return;
      }
      setQuests((prev) => prev.map((q) => (q.id === questId ? data.quest : q)));
      if (activeComposerId === questId) closeComposer();
    } catch {
      setListError("通信エラーが発生しました");
    } finally {
      setRerollingId(null);
    }
  }

  // 写真必須の課題は画像が要る。それ以外はコメントだけでも投稿できる。
  function canSubmit(quest: Quest) {
    return quest.required_media === "photo" ? file !== null : file !== null || comment.trim() !== "";
  }

  async function handleSubmit(e: React.FormEvent, quest: Quest) {
    e.preventDefault();
    if (!user || !canSubmit(quest)) return;
    setSubmitting(true);
    setComposerError(null);
    try {
      const form = new FormData();
      form.append("userId", String(user.id));
      form.append("dailyQuestId", String(quest.id));
      form.append("comment", comment);
      if (file) form.append("media", file);

      const res = await fetch("/api/posts", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setComposerError(data.error ?? "投稿に失敗しました");
        return;
      }
      setResults((prev) => ({ ...prev, [quest.id]: data }));
      setQuests((prev) => prev.map((q) => (q.id === quest.id ? { ...q, completed: true } : q)));
      closeComposer();
    } catch {
      setComposerError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="p-4 text-muted">読み込み中...</p>;
  if (listError && quests.length === 0)
    return <p className="p-4 text-red-600">{listError}</p>;

  const doneCount = quests.filter((q) => q.completed || results[q.id]).length;

  return (
    <div>
      <div className="sticky top-0 bg-paper/90 backdrop-blur border-b border-line px-4 py-3 z-10">
        <h1 className="font-display font-bold text-lg">今日の課題</h1>
        <p className="text-[13px] text-muted mt-0.5">
          {doneCount}/{quests.length} 件達成
        </p>
      </div>

      {listError && <p className="px-4 pt-3 text-sm text-red-600">{listError}</p>}

      <div className="px-4 pt-4 pb-6 space-y-4">
        {quests.map((quest) => {
          const result = results[quest.id];
          const done = Boolean(result) || quest.completed;
          const composerOpen = activeComposerId === quest.id;

          return (
            <div key={quest.id}>
              <div className="relative rounded-2xl border-2 border-dashed border-line bg-paper-warm px-5 py-5 overflow-hidden">
                <div
                  className={`absolute -right-5 -top-5 w-20 h-20 rounded-full flex items-end justify-start pb-4 pl-4 text-2xl transition-all ${
                    done ? "bg-ember-soft" : "bg-line/60 grayscale opacity-60"
                  }`}
                  aria-hidden
                >
                  🔥
                </div>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap pr-10">
                  <span
                    className={`inline-block text-xs font-bold rounded-full px-2.5 py-1 ${
                      CATEGORY_STYLE[quest.category] ?? "bg-paper text-muted"
                    }`}
                  >
                    {CATEGORY_LABEL[quest.category] ?? quest.category}
                  </span>
                  {quest.required_media === "photo" && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-ember-soft text-ember-dark rounded-full px-2.5 py-1">
                      <Camera size={12} />
                      写真必須
                    </span>
                  )}
                </div>
                <p className="font-display font-bold text-[17px] leading-snug pr-10">{quest.title}</p>
                <p className="text-muted text-[15px] mt-1 leading-relaxed">{quest.description}</p>

                {!done && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
                    <button
                      type="button"
                      onClick={() => (composerOpen ? closeComposer() : openComposer(quest.id))}
                      className="rounded-full bg-growth hover:bg-growth-dark text-white px-4 py-1.5 font-bold text-sm transition-colors"
                    >
                      {composerOpen ? "閉じる" : "投稿する"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReroll(quest.id)}
                      disabled={rerollingId === quest.id}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-paper hover:text-ink disabled:opacity-40 transition-colors"
                    >
                      <RotateCcw size={15} className={rerollingId === quest.id ? "animate-spin" : ""} />
                      別の課題にする
                    </button>
                  </div>
                )}
              </div>

              {result && (
                <div className="flex gap-3 px-1 py-4">
                  {user && <Avatar nickname={user.nickname} />}
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="font-display font-bold text-growth-dark text-[15px]">
                      +{result.post.xp_awarded} XP を獲得しました！
                    </p>
                    <p className="text-[15px] text-ink/80">🤖 {result.post.ai_feedback}</p>
                    {result.newBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {result.newBadges.map((b) => (
                          <span
                            key={b.code}
                            className="text-xs bg-ember-soft text-ember-dark rounded-full px-2.5 py-1 font-medium"
                          >
                            🏅 {b.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!result && quest.completed && (
                <p className="px-1 py-3 text-[13px] text-muted">投稿済みです。お疲れさまでした！</p>
              )}

              {composerOpen && (
                <form onSubmit={(e) => handleSubmit(e, quest)} className="px-1 pt-3">
                  <div className="flex gap-3">
                    {user && <Avatar nickname={user.nickname} />}
                    <div className="flex-1 min-w-0">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={
                          quest.required_media === "photo"
                            ? "どうでしたか？一言コメント（任意）"
                            : "どうでしたか？コメントだけでも投稿できます"
                        }
                        maxLength={500}
                        rows={3}
                        className="w-full resize-none outline-none text-[17px] placeholder:text-muted/70"
                      />
                      {previewUrl &&
                        (file?.type.startsWith("video/") ? (
                          <video src={previewUrl} controls className="w-full rounded-2xl mt-2 max-h-80" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt="プレビュー"
                            className="w-full rounded-2xl mt-2 max-h-80 object-cover border border-line"
                          />
                        ))}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={quest.required_media === "photo" ? "image/*" : "image/*,video/*"}
                        capture="environment"
                        required={quest.required_media === "photo"}
                        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 text-growth hover:bg-growth-soft rounded-full px-2 py-1.5 text-sm font-medium transition-colors"
                        >
                          <ImagePlus size={20} />
                          {quest.required_media === "photo"
                            ? "写真を追加"
                            : "写真・動画を追加（任意）"}
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || !canSubmit(quest)}
                          className="rounded-full bg-growth hover:bg-growth-dark text-white px-5 py-2 font-bold text-sm disabled:opacity-40 transition-colors"
                        >
                          {submitting ? "投稿中..." : "投稿する"}
                        </button>
                      </div>
                      {composerError && <p className="text-sm text-red-600 mt-2">{composerError}</p>}
                    </div>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
