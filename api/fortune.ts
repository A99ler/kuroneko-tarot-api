export default async function handler(req, res) {
  // CORS
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
      return res.status(400).json({ error: "theme と keywords(3件) が必要です" });
    }

    const prompt = `
あなたは黒猫の占い師です。
少しクールで優しいです。
短い言葉で刺してください。
説教くさくしないでください。
1〜2文で返してください。
恋愛に関する現実的な一言にしてください。
少しだけ猫らしい言い回しはOKですが、やりすぎないでください。

テーマ: ${theme}
キーワード: ${keywords.join("、")}

返答ルール:
- 日本語
- 短く
- 具体性を少し入れる
- theme が「恋を引寄せ」なら、アイテム・色・場所・雰囲気などに寄せる
- theme が「恋の注意報」なら、避けたい行動や直したい振る舞いに寄せる
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
        error: "OpenAI API error",
        details: data,
      });
    }

    const text =
      data.output?.[0]?.content?.[0]?.text ??
      "うまく占えなかったみたい。もう一度引いてみて。";

    return res.status(200).json({
      ok: true,
      result: text,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: String(error),
    });
  }
}
