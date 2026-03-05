const { admin, getUserFromToken } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const out = await getUserFromToken(req);
  if (!out) return res.status(200).json({ ok: true });

  const sb = admin();
  await sb.from("sessions").delete().eq("token", out.token);
  return res.status(200).json({ ok: true });
};
