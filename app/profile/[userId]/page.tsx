import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProfileHeader from "./ProfileHeader";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const id = Number(userId);
  if (!id) notFound();

  const userRes = await db.query(
    `SELECT r.id, r.nickname, r.total_xp, r.level, r.post_count, r.active_days, r.quest_count, u.bio
     FROM user_rankings r JOIN users u ON u.id = r.id WHERE r.id = $1`,
    [id]
  );
  if (userRes.rows.length === 0) notFound();
  const user = userRes.rows[0];

  const badges = (
    await db.query(
      `SELECT b.code, b.title, b.description, ub.earned_at
       FROM user_badges ub JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = $1 ORDER BY ub.earned_at`,
      [id]
    )
  ).rows;

  const posts = (
    await db.query(
      `SELECT p.id, p.media_url, p.media_type, p.xp_awarded, p.created_at, qc.title AS quest_title
       FROM posts p
       JOIN daily_quests dq ON dq.id = p.daily_quest_id
       JOIN quest_catalog qc ON qc.id = dq.quest_catalog_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [id]
    )
  ).rows;

  return (
    <div>
      <div className="sticky top-0 bg-paper/90 backdrop-blur border-b border-line px-4 py-3 z-10">
        <h1 className="font-display font-bold text-lg">{user.nickname}</h1>
        <p className="text-[13px] text-muted">{posts.length}件の投稿</p>
      </div>

      <ProfileHeader
        userId={id}
        nickname={user.nickname}
        bio={user.bio}
        level={user.level}
        totalXp={user.total_xp}
        postCount={user.post_count}
        activeDays={user.active_days}
        badges={badges}
      />

      <div className="grid grid-cols-3 gap-px bg-line">
        {posts.map((p) => (
          <div key={p.id} className="aspect-square bg-paper overflow-hidden">
            {p.media_type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.media_url} alt={p.quest_title} className="w-full h-full object-cover" />
            ) : (
              <video src={p.media_url} className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
