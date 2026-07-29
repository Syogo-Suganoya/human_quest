"use client";

import { useEffect, useState } from "react";
import { getStoredUser, StoredUser } from "@/lib/client/user";
import PostCard, { FeedPost } from "./PostCard";

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
    fetch("/api/feed")
      .then((res) => res.json())
      .then((data) => {
        if (data.posts) setPosts(data.posts);
        else setError(data.error ?? "フィードの取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="sticky top-0 bg-paper/90 backdrop-blur border-b border-line px-4 py-3 z-10">
        <h1 className="font-display font-bold text-lg">フィード</h1>
      </div>

      {loading && <p className="p-4 text-muted">読み込み中...</p>}
      {error && <p className="p-4 text-red-600">{error}</p>}
      {!loading && !error && posts.length === 0 && (
        <p className="p-4 text-muted">まだ投稿がありません。最初の挑戦を投稿してみましょう。</p>
      )}

      <div className="divide-y divide-line">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} user={user} />
        ))}
      </div>
    </div>
  );
}
