import { GoogleGenAI, type Part } from "@google/genai";

const MODEL = process.env.AI_MODEL ?? "gemini-2.5-flash";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

/**
 * 投稿に対するAIコーチのフィードバックを生成する。
 * GEMINI_API_KEY が未設定、またはAPI呼び出しに失敗した場合は
 * デモ用の固定フィードバックにフォールバックする（不正判定は行わない）。
 */
export async function generateFeedback(params: {
  questTitle: string;
  questDescription: string;
  comment: string;
  mediaType: "image" | "video";
  mediaBase64?: string;
  mediaMimeType?: string;
}): Promise<string> {
  const ai = client();
  if (!ai) {
    return `「${params.questTitle}」への挑戦、お疲れさまでした！行動に移せたこと自体が素晴らしい一歩です。`;
  }

  const prompt = `あなたは「Human Quest」という行動SNSのAIコーチです。
ユーザーは今日の課題「${params.questTitle}」（${params.questDescription}）に挑戦し、投稿しました。
ユーザーのコメント: 「${params.comment || "(コメントなし)"}」

このユーザーを励まし、行動したことを肯定する短いフィードバック（日本語、2〜3文、絵文字は最大1つ）を返してください。
あなたは不正判定や合否判定は行いません。常に挑戦した行動そのものを称賛するコーチとして振る舞ってください。`;

  try {
    const parts: Part[] =
      params.mediaType === "image" && params.mediaBase64 && params.mediaMimeType
        ? [
            {
              inlineData: {
                mimeType: params.mediaMimeType,
                data: params.mediaBase64,
              },
            },
            { text: prompt },
          ]
        : [{ text: prompt }];

    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: { maxOutputTokens: 200 },
    });

    const text = res.text?.trim();
    return text || "今日の挑戦、お疲れさまでした！";
  } catch {
    return `「${params.questTitle}」への挑戦、お疲れさまでした！行動に移せたこと自体が素晴らしい一歩です。`;
  }
}

/**
 * カタログの中からユーザーの直近の傾向を踏まえて今日の課題を1件選ぶ。
 * APIキー未設定時は「直近に挑戦していないカテゴリ」を優先するルールベースにフォールバックする。
 */
export async function pickTodayQuest(params: {
  catalog: { id: number; category: string; title: string; description: string }[];
  recentCategories: string[];
  excludeIds?: number[];
}): Promise<number> {
  const { catalog, recentCategories, excludeIds = [] } = params;
  const pool = catalog.filter((c) => !excludeIds.includes(c.id));
  const usable = pool.length > 0 ? pool : catalog; // 除外しすぎて枯渇したら全体から選び直す

  const leastRecentFirst = [...usable].sort((a, b) => {
    const aIdx = recentCategories.lastIndexOf(a.category);
    const bIdx = recentCategories.lastIndexOf(b.category);
    return aIdx - bIdx;
  });

  const ai = client();
  if (!ai) return leastRecentFirst[0].id;

  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: `以下は行動SNSの課題カタログです。ユーザーの直近の挑戦カテゴリ履歴を踏まえ、
バランス良く成長できるよう次に挑戦すべき課題を1つ選び、その id の数字だけを返してください。

課題カタログ:
${usable.map((c) => `id=${c.id} category=${c.category} title=${c.title}`).join("\n")}

直近の挑戦カテゴリ履歴（新しい順）: ${recentCategories.join(", ") || "なし"}`,
      config: { maxOutputTokens: 20 },
    });

    const match = (res.text ?? "").match(/\d+/);
    const id = match ? Number(match[0]) : NaN;
    return usable.some((c) => c.id === id) ? id : leastRecentFirst[0].id;
  } catch {
    return leastRecentFirst[0].id;
  }
}
