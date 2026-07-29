import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pickTodayQuest } from "@/lib/ai";

// 気に入らない課題を、投稿前であれば別の課題に差し替える。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dailyQuestId: string }> }
) {
  const { dailyQuestId } = await params;
  const id = Number(dailyQuestId);
  const body = await req.json().catch(() => null);
  const userId = Number(body?.userId);

  if (!id || !userId) {
    return NextResponse.json(
      { error: "dailyQuestId, userId は必須です" },
      { status: 400 }
    );
  }

  const client = await db.connect();
  try {
    const target = await client.query(
      `SELECT id, quest_catalog_id FROM daily_quests
       WHERE id = $1 AND user_id = $2 AND assigned_date = CURRENT_DATE AND status = 'active'`,
      [id, userId]
    );
    if (target.rows.length === 0) {
      return NextResponse.json({ error: "課題が見つかりません" }, { status: 404 });
    }

    const posted = await client.query(
      "SELECT 1 FROM posts WHERE daily_quest_id = $1",
      [id]
    );
    if (posted.rows.length > 0) {
      return NextResponse.json(
        { error: "投稿済みの課題はリロールできません" },
        { status: 409 }
      );
    }

    const catalog = (
      await client.query(
        "SELECT id, category, title, description, required_media FROM quest_catalog"
      )
    ).rows;

    const todayCatalogIds = (
      await client.query(
        `SELECT quest_catalog_id FROM daily_quests
         WHERE user_id = $1 AND assigned_date = CURRENT_DATE`,
        [userId]
      )
    ).rows.map((r) => r.quest_catalog_id as number);

    const recentCategories = (
      await client.query(
        `SELECT qc.category
         FROM daily_quests dq
         JOIN quest_catalog qc ON qc.id = dq.quest_catalog_id
         WHERE dq.user_id = $1 AND dq.status = 'active'
         ORDER BY dq.assigned_date DESC
         LIMIT 5`,
        [userId]
      )
    ).rows.map((r) => r.category as string);

    const newQuestCatalogId = await pickTodayQuest({
      catalog,
      recentCategories,
      excludeIds: todayCatalogIds,
    });
    const chosen = catalog.find((c) => c.id === newQuestCatalogId)!;

    await client.query("BEGIN");
    await client.query(
      "UPDATE daily_quests SET status = 'rerolled' WHERE id = $1",
      [id]
    );
    const created = await client.query(
      `INSERT INTO daily_quests (user_id, quest_catalog_id)
       VALUES ($1, $2)
       RETURNING id`,
      [userId, newQuestCatalogId]
    );
    await client.query("COMMIT");

    return NextResponse.json({
      quest: {
        id: created.rows[0].id,
        quest_catalog_id: chosen.id,
        category: chosen.category,
        title: chosen.title,
        description: chosen.description,
        required_media: chosen.required_media,
        completed: false,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    return NextResponse.json({ error: "リロールに失敗しました" }, { status: 500 });
  } finally {
    client.release();
  }
}
