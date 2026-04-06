function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      theme,
      keywords,
      profile,
      attractTags,
      warningTags,
    } = req.body || {};

    if (!theme || !Array.isArray(keywords) || keywords.length !== 3) {
      return res.status(400).json({
        ok: false,
        error: "theme と keywords(3件) が必要です",
      });
    }

    if (!profile || !profile.tone || !profile.phase) {
      return res.status(400).json({
        ok: false,
        error: "profile が必要です",
      });
    }

    let stateLine = "";
    let actionLine = "";
    let detailType = "";
    let detailValue = "";

    if (theme === "恋を引寄せ") {
      if (!attractTags) {
        return res.status(400).json({
          ok: false,
          error: "attractTags が必要です",
        });
      }

      stateLine = pickOne(attractTags.stateHints || ["流れは悪くない"]);
      actionLine = pickOne(attractTags.actionHints || ["今日は自然に話して"]);

      const detailBuckets = [
        { type: "色", values: attractTags.colors || [] },
        { type: "小物", values: attractTags.items || [] },
        { type: "場所", values: attractTags.places || [] },
        { type: "雰囲気", values: attractTags.moods || [] },
      ].filter((bucket) => Array.isArray(bucket.values) && bucket.values.length > 0);

      const chosenBucket = pickOne(detailBuckets);
      detailType = chosenBucket?.type || "雰囲気";
      detailValue = pickOne(chosenBucket?.values || ["落ち着いた雰囲気"]);
    } else {
      if (!warningTags) {
        return res.status(400).json({
          ok: false,
          error: "warningTags が必要です",
        });
      }

      stateLine = pickOne(warningTags.cautionStates || ["気持ちがズレやすい日"]);
      actionLine = pickOne(warningTags.avoidActions || ["返事を急がないで"]);
      detailType = "弱点";
      detailValue = pickOne(warningTags.weakPoints || ["言いすぎ"]);
    }

    const prompt = `
あなたは黒猫の恋愛占い師です。
役割は、渡された素材を短く自然な日本語に整えることだけです。

【絶対ルール】
- 1文だけ
- 26〜40文字くらい
- 中学生でも分かる日本語
- 比喩禁止
- 詩っぽい表現禁止
- 猫語禁止
- 難しい言い回し禁止
- 景色の描写は禁止
- ふわっとした話は禁止
- 素材を勝手に増やさない
- 明るいカードで絶望的にしない
- 悪いカードで不自然に前向きにしない

【カードの方向】
トーン: ${profile.tone}
段階: ${profile.phase}
キーワード: ${keywords.join("、")}

【素材】
状態: ${stateLine}
行動: ${actionLine}
補足種別: ${detailType}
補足内容: ${detailValue}

【テーマ別ルール】
- 恋を引寄せ:
  状態 + 行動 + 補足内容 を短くつなぐ
  色・小物・場所・雰囲気のどれか1つだけ入れる
- 恋の注意報:
  状態 + 避けたい行動 を短くつなぐ
  説教っぽくしない
  不安をあおりすぎない

【文の方向】
- positive: 前向き、安心、動きやすい
- neutral: 落ち着き、調整、丁寧
- negative: 注意、慎重、ズレ回避

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
      debug: {
        theme,
        tone: profile.tone,
        phase: profile.phase,
        stateLine,
        actionLine,
        detailType,
        detailValue,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(error),
    });
  }
}
