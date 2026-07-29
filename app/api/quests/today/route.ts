import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pickTodayQuest } from "@/lib/ai";
import { TARGET_DAILY_QUESTS } from "@/lib/quests";

export async function GET(req: NextRequest) {
  const userId = Number(req.nextUrl.searchParams.get("userId"));
  if (!userId) {
    return NextResponse.json({ error: "userId は必須です" }, { status: 400 });
  }

  try {
    const existing = await db.query(
      `SELECT dq.id, dq.quest_catalog_id, qc.category, qc.title, qc.description, qc.required_media,
              EXISTS(SELECT 1 FROM posts p WHERE p.daily_quest_id = dq.id) AS completed
       FROM daily_quests dq
       JOIN quest_catalog qc ON qc.id = dq.quest_catalog_id
       WHERE dq.user_id = $1 AND dq.assigned_date = CURRENT_DATE AND dq.status = 'active'
       ORDER BY dq.id`,
      [userId]
    );

    const quests = existing.rows;
    const missing = TARGET_DAILY_QUESTS - quests.length;

    if (missing > 0) {
      const catalog = (
        await db.query(
          "SELECT id, category, title, description, required_media FROM quest_catalog"
        )
      ).rows;

      const recentCategories = (
        await db.query(
          `SELECT qc.category
           FROM daily_quests dq
           JOIN quest_catalog qc ON qc.id = dq.quest_catalog_id
           WHERE dq.user_id = $1 AND dq.status = 'active'
           ORDER BY dq.assigned_date DESC
           LIMIT 5`,
          [userId]
        )
      ).rows.map((r) => r.category as string);

      const excludeIds: number[] = quests.map((q) => q.quest_catalog_id as number);

      for (let i = 0; i < missing; i++) {
        const questCatalogId = await pickTodayQuest({
          catalog,
          recentCategories,
          excludeIds,
        });
        excludeIds.push(questCatalogId);

        const created = await db.query(
          `INSERT INTO daily_quests (user_id, quest_catalog_id)
           VALUES ($1, $2)
           RETURNING id`,
          [userId, questCatalogId]
        );
        const chosen = catalog.find((c) => c.id === questCatalogId)!;

        quests.push({
          id: created.rows[0].id,
          quest_catalog_id: chosen.id,
          category: chosen.category,
          title: chosen.title,
          description: chosen.description,
          required_media: chosen.required_media,
          completed: false,
        });
      }
    }

    return NextResponse.json({ quests });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "DBに接続できません。docker compose up -d を実行してください" },
      { status: 500 }
    );
  }
}
