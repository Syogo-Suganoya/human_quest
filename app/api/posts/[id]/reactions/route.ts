import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = Number(id);
  const body = await req.json().catch(() => null);
  const userId = Number(body?.userId);
  const kind = body?.kind === "empathy" ? "empathy" : "cheer";

  if (!postId || !userId) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  try {
    await db.query(
      `INSERT INTO post_reactions (post_id, user_id, kind)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id, kind) DO NOTHING`,
      [postId, userId, kind]
    );
    const { rows } = await db.query(
      "SELECT COUNT(*) FROM post_reactions WHERE post_id = $1",
      [postId]
    );
    return NextResponse.json({ reactionCount: Number(rows[0].count) });
  } catch {
    return NextResponse.json({ error: "リアクションに失敗しました" }, { status: 500 });
  }
}
