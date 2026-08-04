import { randomUUID } from "crypto";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateFeedback } from "@/lib/ai";
import { calcXp } from "@/lib/xp";
import { uploadMedia } from "@/lib/storage";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const userId = Number(form.get("userId"));
  const dailyQuestId = Number(form.get("dailyQuestId"));
  const comment = String(form.get("comment") ?? "").slice(0, 500);
  const raw = form.get("media");
  // メディアは任意。写真必須（required_media = 'photo'）の課題のみ、この後で必須チェックする。
  const file = raw instanceof File && raw.size > 0 ? raw : null;

  if (!userId || !dailyQuestId) {
    return NextResponse.json(
      { error: "userId, dailyQuestId は必須です" },
      { status: 400 }
    );
  }
  if (!file && !comment.trim()) {
    return NextResponse.json(
      { error: "写真・動画かコメントのどちらかを入力してください" },
      { status: 400 }
    );
  }
  if (file && file.size > 15 * 1024 * 1024) {
    return NextResponse.json(
      { error: "ファイルサイズは15MB以下にしてください" },
      { status: 400 }
    );
  }

  const isImage = file !== null && IMAGE_TYPES.has(file.type);
  const isVideo = file !== null && file.type.startsWith("video/");
  if (file && !isImage && !isVideo) {
    return NextResponse.json(
      { error: "画像または動画ファイルを選択してください" },
      { status: 400 }
    );
  }

  const client = await db.connect();
  try {
    const questRow = await client.query(
      `SELECT dq.quest_catalog_id, qc.title, qc.description, qc.required_media
       FROM daily_quests dq
       JOIN quest_catalog qc ON qc.id = dq.quest_catalog_id
       WHERE dq.id = $1 AND dq.user_id = $2 AND dq.status = 'active'`,
      [dailyQuestId, userId]
    );
    if (questRow.rows.length === 0) {
      return NextResponse.json({ error: "課題が見つかりません" }, { status: 404 });
    }
    const quest = questRow.rows[0];

    if (quest.required_media === "photo" && !isImage) {
      return NextResponse.json(
        { error: "この課題は写真での投稿が必要です" },
        { status: 400 }
      );
    }

    const alreadyPosted = await client.query(
      "SELECT 1 FROM posts WHERE daily_quest_id = $1",
      [dailyQuestId]
    );
    if (alreadyPosted.rows.length > 0) {
      return NextResponse.json(
        { error: "この課題はすでに投稿済みです" },
        { status: 409 }
      );
    }

    // メディアなし（コメントのみ）の投稿は media_url を空、media_type を 'none' として保存する
    const mediaType = isImage ? "image" : isVideo ? "video" : "none";
    let mediaUrl = "";
    let buffer: Buffer | null = null;
    if (file) {
      buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || (isImage ? ".jpg" : ".mp4");
      mediaUrl = await uploadMedia(buffer, `${randomUUID()}${ext}`, file.type);
    }

    const feedback = await generateFeedback({
      questTitle: quest.title,
      questDescription: quest.description,
      comment,
      mediaType,
      mediaBase64: isImage && buffer ? buffer.toString("base64") : undefined,
      mediaMimeType: isImage && file ? file.type : undefined,
    });

    const previousAttempts = Number(
      (
        await client.query(
          "SELECT COUNT(*) FROM xp_events WHERE user_id = $1 AND quest_catalog_id = $2",
          [userId, quest.quest_catalog_id]
        )
      ).rows[0].count
    );
    const xp = calcXp(previousAttempts);

    await client.query("BEGIN");
    const postRes = await client.query(
      `INSERT INTO posts (user_id, daily_quest_id, media_url, media_type, comment, ai_feedback, xp_awarded)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, media_url, media_type, comment, ai_feedback, xp_awarded, created_at`,
      [userId, dailyQuestId, mediaUrl, mediaType, comment, feedback, xp]
    );
    const post = postRes.rows[0];

    await client.query(
      `INSERT INTO xp_events (user_id, quest_catalog_id, post_id, points) VALUES ($1, $2, $3, $4)`,
      [userId, quest.quest_catalog_id, post.id, xp]
    );

    const stats = (
      await client.query(
        `SELECT COUNT(DISTINCT p.id) AS post_count,
                COUNT(DISTINCT qc.category) AS category_count
         FROM posts p
         JOIN daily_quests dq ON dq.id = p.daily_quest_id
         JOIN quest_catalog qc ON qc.id = dq.quest_catalog_id
         WHERE p.user_id = $1`,
        [userId]
      )
    ).rows[0];
    const postCount = Number(stats.post_count);
    const categoryCount = Number(stats.category_count);

    const earnedCodes: string[] = [];
    if (postCount >= 1) earnedCodes.push("first_step");
    if (categoryCount >= 3) earnedCodes.push("explorer");
    if (postCount >= 10) earnedCodes.push("century");

    let newBadges: { code: string; title: string; description: string }[] = [];
    if (earnedCodes.length > 0) {
      const inserted = await client.query(
        `INSERT INTO user_badges (user_id, badge_id)
         SELECT $1, b.id FROM badges b WHERE b.code = ANY($2::text[])
         ON CONFLICT (user_id, badge_id) DO NOTHING
         RETURNING badge_id`,
        [userId, earnedCodes]
      );
      if (inserted.rows.length > 0) {
        const badgeIds = inserted.rows.map((r) => r.badge_id);
        newBadges = (
          await client.query(
            "SELECT code, title, description FROM badges WHERE id = ANY($1::int[])",
            [badgeIds]
          )
        ).rows;
      }
    }

    await client.query("COMMIT");

    return NextResponse.json({ post, xp, newBadges });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    return NextResponse.json(
      { error: "投稿の作成に失敗しました" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
