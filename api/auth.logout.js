import { supabaseAdmin } from "./_supabase.js";
import { json, requireSession } from "./_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    const s = await requireSession(req);

    await supabaseAdmin.from("sessions").delete().eq("token", s.token);
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 401, { error: e?.message || "Unauthorized" });
  }
}