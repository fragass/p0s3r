const { getUserFromToken } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });

  const out = await getUserFromToken(req);
  if (!out) return res.status(401).json({ success: false });

  // Leave is client-side only in this simple model
  return res.status(200).json({ success: true });
};
