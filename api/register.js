const bcrypt = require("bcryptjs");
const { admin, makeToken, ttlIsoHours } = require("./_lib");

function isValidUsername(u) {
  return typeof u === "string" && /^[A-Za-z0-9_]{3,32}$/.test(u);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Método não permitido" });

  const { username, password } = req.body || {};
  if (!isValidUsername(username) || typeof password !== "string" || password.length < 4) {
    return res.status(400).json({ success: false, message: "Usuário inválido (3+ letras/números/_) ou senha muito curta." });
  }

  try {
    const sb = admin();
    const password_hash = await bcrypt.hash(password, 10);

    const { data: created, error } = await sb
      .from("users")
      .insert({ username: String(username), password_hash })
      .select("id,username")
      .single();

    if (error) {
      const msg = String(error.message || "");
      if (msg.toLowerCase().includes("duplicate")) return res.status(409).json({ success: false, message: "Usuário já existe." });
      return res.status(400).json({ success: false, message: msg });
    }

    const token = makeToken();
    const ttl = Number(process.env.SESSION_TTL_HOURS || 168);
    const expires_at = ttlIsoHours(ttl);

    const { error: sErr } = await sb.from("sessions").insert({ token, user_id: created.id, expires_at });
    if (sErr) return res.status(500).json({ success: false, message: sErr.message });

    return res.status(200).json({ success: true, token, user: created.username });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Erro interno" });
  }
};
