const { admin, getUserFromToken, isValidRoom } = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

    const out = await getUserFromToken(req);
    if (!out) return res.status(401).json({ success: false, error: "Unauthorized" });

    const body = req.body || {};
    const creator = String(body.creator || body.name || body.user1 || out.user.username);
    const target = String(body.target || body.to || body.user2 || "");
    const roomWanted = String(body.room || "");

    if (!creator || !target || !roomWanted) {
      return res.status(400).json({ success: false, error: "Dados incompletos. Use: /c @usuario NOME_DA_SALA" });
    }
    if (creator === target) {
      return res.status(400).json({ success: false, error: "Você precisa marcar OUTRO usuário para criar uma sala. Ex: /c @fulano sala123" });
    }
    if (!isValidRoom(roomWanted)) {
      return res.status(400).json({ success: false, error: 'Nome de sala inválido. Use 3 a 32 caracteres: letras, números, "_" ou "-".' });
    }

    const sb = admin();

    // create channel (if pair exists, reuse)
    const pairUsers = [creator, target].sort();
    const pair_key = `${pairUsers[0]}:${pairUsers[1]}`;

    // Try find existing by pair_key
    const { data: existing } = await sb.from("private_channels").select("id,room,user1,user2").eq("pair_key", pair_key).maybeSingle();
    if (existing) {
      // optional: also ensure roomWanted maps - but UI expects same room name; we keep first created room
      return res.status(200).json({ success: true, room: existing.room, channel: existing });
    }

    const { data: created, error } = await sb
      .from("private_channels")
      .insert({ room: roomWanted, user1: creator, user2: target })
      .select("id,room,user1,user2")
      .single();

    if (error) {
      // if room taken, return helpful
      if (String(error.message || "").toLowerCase().includes("duplicate")) {
        return res.status(409).json({ success: false, error: "Esse nome de sala já existe. Escolha outro." });
      }
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, room: created.room, channel: created });
  } catch (e) {
    return res.status(500).json({ success: false, error: "Erro interno" });
  }
};
