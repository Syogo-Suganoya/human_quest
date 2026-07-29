import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await db.query(
      `SELECT id, nickname, total_xp, level, post_count, active_days, quest_count
       FROM user_rankings
       ORDER BY total_xp DESC, active_days DESC
       LIMIT 50`
    );
    return NextResponse.json({ ranking: rows });
  } catch {
    return NextResponse.json(
      { error: "DBに接続できません。docker compose up -d を実行してください" },
      { status: 500 }
    );
  }
}
