"use client";

import { useState } from "react";
import { HandHeart, MessageCircle } from "lucide-react";
import { StoredUser } from "@/lib/client/user";
import Avatar from "@/components/Avatar";

export type FeedPost = {
  id: number;
  media_url: string;
  media_type: "image" | "video" | "none";
  comment: string;
  ai_feedback: string;
  xp_awarded: number;
  created_at: string;
  user_id: number;
  nickname: string;
  quest_title: string;
  quest_category: string;
  reaction_count: string | number;
  comment_count: string | number;
};

type Comment = { id: number; body: string; created_at: string; user_id: number; nickname: string };

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間`;
  return `${Math.floor(hr / 24)}日`;
}

export default function PostCard({ post, user }: { post: FeedPost; user: StoredUser | null }) {
  const [reactionCount, setReactionCount] = useState(Number(post.reaction_count));
  const [reacted, setReacted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  async function handleReact() {
    if (!user || reacted) return;
    setReacted(true);
    setReactionCount((c) => c + 1);
    await fetch(`/api/posts/${post.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, kind: "cheer" }),
    }).catch(() => {});
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setLoadingComments(true);
      const res = await fetch(`/api/posts/${post.id}/comments`);
      const data = await res.json();
      setComments(data.comments ?? []);
      setLoadingComments(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !commentText.trim()) return;
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, body: commentText }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((prev) => [...prev, { ...data.comment, user_id: user.id, nickname: user.nickname }]);
      setCommentText("");
    }
  }

  return (
    <article className="flex gap-3 px-4 py-3 hover:bg-paper-warm/60 transition-colors">
      <Avatar nickname={post.nickname} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[15px]">
          <span className="font-bold truncate">{post.nickname}</span>
          <span className="text-muted">·</span>
          <span className="text-muted">{relativeTime(post.created_at)}</span>
          <span className="text-muted">·</span>
          <span className="text-muted truncate">{post.quest_title}</span>
        </div>

        {post.comment && <p className="text-[15px] mt-0.5 whitespace-pre-wrap">{post.comment}</p>}

        {post.media_type === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.media_url}
            alt={post.quest_title}
            className="w-full max-h-96 object-cover rounded-2xl mt-2 border border-line"
          />
        )}
        {post.media_type === "video" && (
          <video
            src={post.media_url}
            controls
            className="w-full max-h-96 rounded-2xl mt-2 border border-line"
          />
        )}

        <p className="text-[13px] text-muted bg-paper-warm rounded-xl px-3 py-2 mt-2">
          🤖 {post.ai_feedback}
        </p>

        <div className="flex items-center gap-8 mt-2 text-muted">
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 hover:text-growth text-[13px] transition-colors"
          >
            <MessageCircle size={17} />
            {showComments ? comments.length : Number(post.comment_count)}
          </button>
          <button
            onClick={handleReact}
            disabled={!user || reacted}
            className={`flex items-center gap-1.5 text-[13px] transition-colors ${
              reacted ? "text-ember-dark" : "hover:text-ember-dark"
            }`}
          >
            <HandHeart size={17} fill={reacted ? "currentColor" : "none"} />
            {reactionCount}
          </button>
          <span className="text-[13px] font-display font-bold text-growth-dark">
            +{post.xp_awarded} XP
          </span>
        </div>

        {showComments && (
          <div className="mt-2 space-y-2">
            {loadingComments && <p className="text-xs text-muted/70">読み込み中...</p>}
            {comments.map((c) => (
              <p key={c.id} className="text-[13px]">
                <span className="font-bold">{c.nickname}</span> {c.body}
              </p>
            ))}
            {user && (
              <form onSubmit={handleComment} className="flex gap-2 pt-1">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="返信をポスト"
                  maxLength={300}
                  className="flex-1 rounded-full border border-line px-3 py-1.5 text-[13px] outline-none focus:border-growth"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="text-[13px] text-white bg-growth hover:bg-growth-dark rounded-full px-3 py-1.5 font-medium disabled:opacity-40 transition-colors"
                >
                  返信
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
