const { admin, getUserFromToken } = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    const out = await getUserFromToken(req);
    if (!out) {
      // fail silent no GET pra não quebrar UI
      if (req.method === "GET") return res.status(200).json([]);
      return res.status(401).json({ success: false });
    }

    const sb = admin();

    if (req.method === "GET") {
      const since = new Date(Date.now() - 35_000).toISOString();
      const { data } = await sb.from("online_users").select("*").gte("last_seen", since).order("last_seen", { ascending: false }).limit(100);
      return res.status(200).json(data || []);
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const name = String(body.name || out.user.username);

      const { error } = await sb.from("online_users").upsert({ name, last_seen: new Date().toISOString() });
      if (error) return res.status(400).json({ success: false });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false });
  } catch {
    return res.status(200).json([]);
  }
};
