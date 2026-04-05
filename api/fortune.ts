export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { theme, keywords } = req.body || {};

  return res.status(200).json({
    ok: true,
    message: "API接続成功",
    theme,
    keywords,
  });
}
