const bcrypt = require("bcryptjs");
const { admin, makeToken, ttlIsoHours } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Método não permitido" });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, message: "Dados incompletos" });

  try {
    const sb = admin();

    const { data: user } = await sb.from("users").select("id,username,password_hash").eq("username", String(username)).maybeSingle();
    if (!user) return res.status(401).json({ success: false });

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ success: false });

    const token = makeToken();
    const ttl = Number(process.env.SESSION_TTL_HOURS || 168);
    const expires_at = ttlIsoHours(ttl);

    const { error: sErr } = await sb.from("sessions").insert({ token, user_id: user.id, expires_at });
    if (sErr) return res.status(500).json({ success: false, message: sErr.message });

    return res.status(200).json({ success: true, token, user: user.username });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Erro interno" });
  }
};
