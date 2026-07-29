"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { getStoredUser, setStoredUser } from "@/lib/client/user";
import Avatar from "@/components/Avatar";

type Badge = { code: string; title: string; description: string };

type Props = {
  userId: number;
  nickname: string;
  bio: string;
  level: number | string;
  totalXp: number | string;
  postCount: number | string;
  activeDays: number | string;
  badges: Badge[];
};

export default function ProfileHeader({
  userId,
  nickname,
  bio,
  level,
  totalXp,
  postCount,
  activeDays,
  badges,
}: Props) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(nickname);
  const [bioInput, setBioInput] = useState(bio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    setIsOwner(u?.id === userId);
  }, [userId]);

  function startEdit() {
    setNicknameInput(nickname);
    setBioInput(bio);
    setError(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nicknameInput, bio: bioInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました");
        return;
      }
      setStoredUser({ id: userId, nickname: data.user.nickname });
      setEditing(false);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="px-4 py-4 border-b border-line space-y-3">
        <Avatar nickname={nicknameInput || nickname} size="lg" />
        <div>
          <label className="block text-xs font-bold text-muted mb-1">ニックネーム</label>
          <input
            type="text"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            maxLength={30}
            required
            className="w-full rounded-xl border border-line bg-paper-warm px-3 py-2 text-[15px] outline-none focus:border-growth focus:ring-2 focus:ring-growth/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted mb-1">自己紹介</label>
          <textarea
            value={bioInput}
            onChange={(e) => setBioInput(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="自己紹介を入力（任意）"
            className="w-full resize-none rounded-xl border border-line bg-paper-warm px-3 py-2 text-[15px] outline-none focus:border-growth focus:ring-2 focus:ring-growth/20 transition-colors placeholder:text-muted/70"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-growth hover:bg-growth-dark text-white px-5 py-2 font-bold text-sm disabled:opacity-40 transition-colors"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-full px-5 py-2 font-bold text-sm text-muted hover:bg-paper-warm transition-colors"
          >
            キャンセル
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="px-4 py-4 border-b border-line">
      <div className="flex items-start justify-between">
        <Avatar nickname={nickname} size="lg" />
        {isOwner && (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink/70 hover:bg-paper-warm transition-colors"
          >
            <Pencil size={14} />
            編集
          </button>
        )}
      </div>
      <p className="font-display font-bold text-xl mt-3">{nickname}</p>
      {bio && <p className="text-[15px] text-ink/80 mt-1 whitespace-pre-wrap">{bio}</p>}
      <p className="text-[15px] text-muted mt-1">
        Lv.{level} · <span className="font-display font-bold text-growth-dark">{totalXp} XP</span> ·
        投稿{postCount}回 · 活動{activeDays}日
      </p>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {badges.map((b) => (
            <span
              key={b.code}
              title={b.description}
              className="text-xs bg-ember-soft text-ember-dark rounded-full px-2.5 py-1 font-medium"
            >
              🏅 {b.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
