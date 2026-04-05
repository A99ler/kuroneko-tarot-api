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
少しクールで落ち着いたやさしい口調です。
優しいけど少し毒のある言葉で短く刺してください。
説教しないでください。
1〜2文で返してください。
恋愛に関する現実的な一言にしてください。抽象化を避けてください。

重要:
- 猫語は禁止（にゃ、ニャ、にゃん 等）
- 完全に自然な人間の日本語で書く
- キャラは「黒猫」だが、言葉は普通の人間

テーマ: ${theme}
キーワード: ${keywords.join("、")}

返答ルール:
- 日本語
- 短く
- 具体性を少し入れる
- 「恋を引寄せ」なら、色・アイテム・場所・雰囲気に寄せる
- 「恋の注意報」なら、避けたい行動や直したい振る舞いに寄せる
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
