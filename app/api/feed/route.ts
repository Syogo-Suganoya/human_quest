import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.media_url, p.media_type, p.comment, p.ai_feedback, p.xp_awarded, p.created_at,
              u.id AS user_id, u.nickname,
              qc.title AS quest_title, qc.category AS quest_category,
              COUNT(DISTINCT pr.id) AS reaction_count,
              COUNT(DISTINCT pc.id) AS comment_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       JOIN daily_quests dq ON dq.id = p.daily_quest_id
       JOIN quest_catalog qc ON qc.id = dq.quest_catalog_id
       LEFT JOIN post_reactions pr ON pr.post_id = p.id
       LEFT JOIN post_comments pc ON pc.post_id = p.id
       GROUP BY p.id, u.id, qc.id
       ORDER BY p.created_at DESC
       LIMIT 50`
    );
    return NextResponse.json({ posts: rows });
  } catch {
    return NextResponse.json(
      { error: "DBに接続できません。docker compose up -d を実行してください" },
      { status: 500 }
    );
  }
}
