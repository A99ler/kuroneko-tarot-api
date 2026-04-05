export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { theme, keywords } = req.body || {};

    if (!theme || !Array.isArray(keywords) || keywords.length !== 3) {
      return res.status(400).json({
        ok: false,
        error: "theme と keywords(3件) が必要です",
      });
    }

    const prompt = `
あなたは黒猫の占い師です。
落ち着いていて、やさしいが、言い方はシンプルです。

以下を必ず守ってください。

【最重要】
- 分かりやすい日本語だけを使う
- 中学生でもすぐ分かる言い方にする
- 詩っぽくしない
- 比喩を使わない
- 抽象表現を減らす
- ふわっとした表現を避ける
- 猫語は禁止（にゃ、ニャ、にゃん 等）
- 敬語にしない

【文の長さ】
- 2文まで
- 1文は短く
- 全体で40〜55文字くらい
- 長く説明しない

【内容】
- 1文目で「今の状態」をはっきり言う
- 2文目で「今日やるといいこと」か「避けた方がいいこと」を1つだけ言う
- 1回で理解できる内容にする
- 1文に情報を詰め込みすぎない

【テーマ別ルール】
- 「恋を引寄せ」なら、色・服・小物・場所のどれかを1つだけ入れる
- 「恋の注意報」なら、やめた方がいい行動を1つだけ入れる

【禁止】
- 世界観を盛りすぎる表現
- 景色の描写
- 哲学っぽい言い回し
- 「運命」「波動」「光」「気配」などの曖昧語の多用
- 難しい言い回し

テーマ: ${theme}
キーワード: ${keywords.join("、")}

出力は占い文だけにしてください。

出力例:
- 気持ちが急ぎやすい日。今日は返信を急がない方がいい。
- 恋の流れは悪くない。白い服を選ぶとやわらかく見える。
- 今は考えすぎやすい。会う前に言いたいことを一つに絞って。
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: prompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "OpenAI API error",
        details: data,
      });
    }

    const text =
      data.output
        ?.flatMap((item) => item.content ?? [])
        ?.find((part) => part.type === "output_text")
        ?.text?.trim() || "うまく占えなかったみたい。もう一度引いてみて。";

    return res.status(200).json({
      ok: true,
      result: text,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(error),
    });
  }
}
