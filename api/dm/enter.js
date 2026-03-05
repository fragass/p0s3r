const { admin, getUserFromToken, isValidRoom } = require("./_lib");

const DM_TTL_MINUTES = Number(process.env.DM_TTL_MINUTES || 360);

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

    const out = await getUserFromToken(req);
    if (!out) return res.status(401).json({ success: false, error: "Unauthorized" });

    const body = req.body || {};
    const name = String(body.name || out.user.username);
    const room = String(body.room || "");

    if (!isValidRoom(room)) return res.status(400).json({ success: false, error: "Nome da sala inválido." });

    const sb = admin();

    const { data: channel } = await sb.from("private_channels").select("id,room,user1,user2,created_at").eq("room", room).maybeSingle();
    if (!channel) return res.status(404).json({ success: false, error: "Canal não encontrado." });

    const allowed = channel.user1 === name || channel.user2 === name;
    if (!allowed) return res.status(403).json({ success: false, error: "Você não participa desse canal." });

    // TTL check
    const createdAt = new Date(channel.created_at).getTime();
    if (Date.now() - createdAt > DM_TTL_MINUTES * 60_000) {
      return res.status(410).json({ success: false, error: "Este canal expirou." });
    }

    return res.status(200).json({ success: true, room: channel.room, channel });
  } catch (e) {
    return res.status(500).json({ success: false, error: "Erro interno" });
  }
};
