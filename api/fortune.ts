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
      役割は、渡された材料を「短い一言」にすることだけです。
      
      【絶対ルール】
      - 1文だけ
      - 22〜32文字くらい
      - 小学生でも分かる言葉
      - むずかしい言い回し禁止
      - 比喩禁止
      - 詩っぽさ禁止
      - 猫語禁止
      - 景色の描写禁止
      - 同じ意味の言葉をくり返さない
      - キーワードの言い換えを何度もしない
      - ふわっとした表現は禁止
      - 長い説明は禁止
      - 「〜しやすい」「〜になりやすい」を連続で使わない
      - 材料を全部使おうとしない
      - 一番大事なことだけ残す
      
      【カードの方向】
      トーン: ${profile.tone}
      段階: ${profile.phase}
      キーワード: ${keywords.join("、")}
      
      【材料】
      状態: ${stateLine}
      行動: ${actionLine}
      補足種別: ${detailType}
      補足内容: ${detailValue}
      
      【優先ルール】
      - まず「状態」か「行動」のどちらかを中心にする
      - 補足は1つだけ足す
      - 同じ内容なら片方を捨てる
      - 1回読んで意味が分かる文にする
      
      【テーマ別】
      - 恋を引寄せ:
        明るく短く
        色・小物・場所・雰囲気は1つだけ入れる
      - 恋の注意報:
        注意点を短く言う
        おどさない
        行動は1つだけ
      
      【言葉の例】
      使ってよい言葉:
      - 今はいい流れ
      - 今日は急がないで
      - 白より青系が合う
      - 言いすぎないで
      - 笑顔を増やして
      - 落ち着いて話して
      
      使わない言葉:
      - 気配
      - 波動
      - 光
      - 運命
      - 揺らぎ
      - 余白
      - 世界観
      - 気持ちが動きやすい流れ
      - 距離が縮まりやすい気配
      
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
