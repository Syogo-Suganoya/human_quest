import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ニックネームのみの疑似ログイン。既存なら取得、なければ作成する。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";

  if (!nickname || nickname.length > 30) {
    return NextResponse.json(
      { error: "ニックネームは1〜30文字で入力してください" },
      { status: 400 }
    );
  }

  try {
    const existing = await db.query(
      "SELECT id, nickname FROM users WHERE nickname = $1",
      [nickname]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ user: existing.rows[0] });
    }

    const created = await db.query(
      "INSERT INTO users (nickname) VALUES ($1) RETURNING id, nickname",
      [nickname]
    );
    return NextResponse.json({ user: created.rows[0] });
  } catch {
    return NextResponse.json(
      { error: "DBに接続できません。docker compose up -d を実行してください" },
      { status: 500 }
    );
  }
}
