import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = Number(id);
  try {
    const { rows } = await db.query(
      `SELECT pc.id, pc.body, pc.created_at, u.id AS user_id, u.nickname
       FROM post_comments pc
       JOIN users u ON u.id = pc.user_id
       WHERE pc.post_id = $1
       ORDER BY pc.created_at ASC`,
      [postId]
    );
    return NextResponse.json({ comments: rows });
  } catch {
    return NextResponse.json({ error: "コメントの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = Number(id);
  const body = await req.json().catch(() => null);
  const userId = Number(body?.userId);
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, 300) : "";

  if (!postId || !userId || !text) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO post_comments (post_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [postId, userId, text]
    );
    return NextResponse.json({ comment: rows[0] });
  } catch {
    return NextResponse.json({ error: "コメントの投稿に失敗しました" }, { status: 500 });
  }
}
