function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function short(list, fallback) {
  if (!Array.isArray(list) || list.length === 0) return fallback;
  return pickOne(list);
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

    if (!theme || !Array.isArray(keywords) || keywords.length < 1) {
      return res.status(400).json({
        ok: false,
        error: "theme と keywords(1件以上) が必要です",
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

      stateLine = short(attractTags.stateHints, "流れはいい");
      actionLine = short(attractTags.actionHints, "今日は素直に");
      
      const detailBuckets = [
        { type: "色", values: attractTags.colors || [] },
        { type: "小物", values: attractTags.items || [] },
        { type: "場所", values: attractTags.places || [] },
        { type: "雰囲気", values: attractTags.moods || [] },
      ].filter((bucket) => Array.isArray(bucket.values) && bucket.values.length > 0);

      const chosenBucket = detailBuckets.length > 0
        ? pickOne(detailBuckets)
        : { type: "雰囲気", values: ["落ち着いた雰囲気"] };

      detailType = chosenBucket.type;
      detailValue = short(chosenBucket.values, "落ち着いた雰囲気");
    } else {
      if (!warningTags) {
        return res.status(400).json({
          ok: false,
          error: "warningTags が必要です",
        });
      }

      stateLine = short(warningTags.cautionStates, "ズレやすい日");
      actionLine = short(warningTags.avoidActions, "返事を急がないで");
      detailType = "弱点";
      detailValue = short(warningTags.weakPoints, "言いすぎ");
    }

    const keywordText = keywords.join("、");

    const prompt = `
あなたは黒猫の恋愛占い師です。
役割は、材料を「短く分かりやすい一言」にすることだけです。

【絶対ルール】
- 1文だけ
- 20〜30文字くらい
- やさしい普通の日本語
- 小学生でも分かる言葉
- 比喩は禁止
- 詩っぽさ禁止
- 猫語禁止
- 景色の描写禁止
- 長い説明禁止
- 同じ意味の言葉をくり返さない
- キーワードの言い換えを重ねない
- 材料を全部使おうとしない
- 一番大事なことだけ残す
- 「〜しやすい」を2回使わない
- 「流れ」「気持ち」などを重ねすぎない

【カードの方向】
トーン: ${profile.tone}
段階: ${profile.phase}
キーワード: ${keywordText}

【使う材料】
状態: ${stateLine}
行動: ${actionLine}
補足種別: ${detailType}
補足内容: ${detailValue}

【作り方】
- まず「状態」か「行動」のどちらかを中心にする
- 補足は1つだけ入れる
- 似た内容なら片方を捨てる
- 1回読めば意味が分かる文にする

【テーマ別】
- 恋を引寄せ:
  明るく短く
  色・小物・場所・雰囲気のどれか1つだけ入れる
- 恋の注意報:
  注意点を短く言う
  おどさない
  行動は1つだけ

【良い例】
- 流れはいい。今日は白より青系で。
- 今は動ける日。軽く話してみて。
- ズレやすい日。返事を急がないで。
- 考えすぎやすい日。言いすぎないで。

【悪い例】
- 心の波が静かに揺れている
- 光が見えにくい流れです
- 距離が縮まりやすい気配があります
- 運命の風向きが変わりそうです

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
        keywordText,
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
