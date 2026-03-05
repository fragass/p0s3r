import { supabaseAdmin } from "./_supabase.js";
import { json, getBody, sha256, randomToken } from "./_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const body = getBody(req);
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!username || !password) return json(res, 400, { error: "Dados incompletos." });

    const { data: u, error: ue } = await supabaseAdmin
      .from("users")
      .select("id,username,password_hash")
      .eq("username", username)
      .maybeSingle();

    if (ue) throw ue;
    if (!u) return json(res, 401, { error: "Usuário ou senha inválidos." });

    if (u.password_hash !== sha256(password)) {
      return json(res, 401, { error: "Usuário ou senha inválidos." });
    }

    const token = randomToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 dias

    const { error: se } = await supabaseAdmin
      .from("sessions")
      .insert({ token, user_id: u.id, expires_at: expiresAt.toISOString() });

    if (se) throw se;

    return json(res, 200, { ok: true, token, user: { id: u.id, username: u.username } });
  } catch (e) {
    return json(res, 500, { error: e?.message || "Erro interno" });
  }
}