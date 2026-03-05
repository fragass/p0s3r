const { getUserFromToken } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  const out = await getUserFromToken(req);
  if (!out) return res.status(401).json({ ok: false });
  return res.status(200).json({ ok: true, user: out.user });
};
