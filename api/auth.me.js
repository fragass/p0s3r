import { json, requireSession } from "./_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
    const s = await requireSession(req);
    return json(res, 200, { ok: true, user: s.user });
  } catch (e) {
    return json(res, 401, { error: e?.message || "Unauthorized" });
  }
}