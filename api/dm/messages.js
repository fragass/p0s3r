const { admin, getUserFromToken } = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    const out = await getUserFromToken(req);
    if (!out) return res.status(401).json({ success: false, error: "Unauthorized" });

    const sb = admin();

    async function getChannelByRoom(room) {
      const { data } = await sb.from("private_channels").select("id,room,user1,user2").eq("room", room).maybeSingle();
      return data || null;
    }

    if (req.method === "GET") {
      const room = String(req.query.room || "");
      const name = String(req.query.name || out.user.username);
      if (!room || !name) return res.status(400).json({ success: false, error: "Missing room/name" });

      const channel = await getChannelByRoom(room);
      if (!channel) return res.status(200).json([]);

      const allowed = channel.user1 === name || channel.user2 === name;
      if (!allowed) return res.status(403).json([]);

      const { data, error } = await sb
        .from("private_messages")
        .select("*")
        .eq("room", room)
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) return res.status(400).json({ success: false, error: error.message });
      return res.status(200).json(data || []);
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const room = String(body.room || "");
      const name = String(body.name || out.user.username);
      const content = body.content == null ? null : String(body.content);
      const image_url = body.image_url == null ? null : String(body.image_url);

      if (!room || !name) return res.status(400).json({ success: false, error: "Missing room/name" });

      const channel = await getChannelByRoom(room);
      if (!channel) return res.status(404).json({ success: false, error: "Canal não encontrado" });

      const allowed = channel.user1 === name || channel.user2 === name;
      if (!allowed) return res.status(403).json({ success: false, error: "Você não participa desse canal." });

      if (!content && !image_url) return res.status(400).json({ success: false, error: "Mensagem vazia" });

      const { error } = await sb.from("private_messages").insert({ room, name, content, image_url });
      if (error) return res.status(400).json({ success: false, error: error.message });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ success: false, error: "Erro interno" });
  }
};
