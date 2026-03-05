const { admin, getUserFromToken } = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    const out = await getUserFromToken(req);
    if (!out) return res.status(401).json({ error: "Unauthorized" });

    const sb = admin();

    if (req.method === "GET") {
      const { data, error } = await sb.from("messages").select("*").order("created_at", { ascending: true }).limit(500);
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(data || []);
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const name = String(body.name || out.user.username);
      const content = body.content == null ? null : String(body.content);
      const image_url = body.image_url == null ? null : String(body.image_url);
      const to = body.to == null ? null : String(body.to);
      const reply_to = body.reply_to == null ? null : Number(body.reply_to);
      const reply_preview = body.reply_preview == null ? null : String(body.reply_preview);

      if (!content && !image_url) return res.status(400).json({ error: "Mensagem vazia" });

      const { error } = await sb.from("messages").insert({ name, content, image_url, to, reply_to, reply_preview });
      if (error) return res.status(400).json({ error: error.message });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "Erro interno" });
  }
};
