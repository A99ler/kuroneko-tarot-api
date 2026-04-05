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
少しクールで落ち着いた、やさしい口調です。

必ず以下を守ってください。

【出力ルール】
- 1〜2文
- 合計40〜60文字前後
- 1文目は25文字以内、2文目は30文字以内
- 抽象表現を減らす
- すぐ想像できる具体語を1つ入れる
- 言い切りすぎない
- 説教しない
- 猫語は禁止（にゃ、ニャ、にゃん 等）
- 完全に自然な日本語
- 比喩を使いすぎない
- 詩っぽくしない
- 1文目は25文字以内
- 2文目は30文字以内

【構成】
1文目: 今の気配を短く言う
2文目: 行動を1つだけ言う

【テーマ別】
- 「恋を引寄せ」なら、色・服・小物・場所のどれか1つを入れる
- 「恋の注意報」なら、避けたい行動を1つだけ言う

テーマ: ${theme}
キーワード: ${keywords.join("、")}

出力は占い文だけにしてください。
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
