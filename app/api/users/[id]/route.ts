import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// プロフィール編集：ニックネーム・自己紹介の更新（本人のみ想定。擬似認証のためuserIdはクライアント申告値）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = Number(id);
  if (!userId) {
    return NextResponse.json({ error: "不正なユーザーIDです" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
  const bio = typeof body?.bio === "string" ? body.bio.trim().slice(0, 200) : "";

  if (!nickname || nickname.length > 30) {
    return NextResponse.json(
      { error: "ニックネームは1〜30文字で入力してください" },
      { status: 400 }
    );
  }

  try {
    const duplicate = await db.query(
      "SELECT id FROM users WHERE nickname = $1 AND id != $2",
      [nickname, userId]
    );
    if (duplicate.rows.length > 0) {
      return NextResponse.json(
        { error: "そのニックネームはすでに使われています" },
        { status: 409 }
      );
    }

    const updated = await db.query(
      `UPDATE users SET nickname = $1, bio = $2 WHERE id = $3
       RETURNING id, nickname, bio`,
      [nickname, bio, userId]
    );
    if (updated.rows.length === 0) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ user: updated.rows[0] });
  } catch {
    return NextResponse.json(
      { error: "DBに接続できません。docker compose up -d を実行してください" },
      { status: 500 }
    );
  }
}
