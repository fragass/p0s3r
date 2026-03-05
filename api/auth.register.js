import { supabaseAdmin } from "./_supabase.js";
import { json, getBody, sha256 } from "./_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const body = getBody(req);
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return json(res, 400, { error: "Username inválido (a-z, 0-9, _ e 3-20)." });
    }
    if (password.length < 6) {
      return json(res, 400, { error: "Senha muito curta (mínimo 6)." });
    }

    const { error } = await supabaseAdmin
      .from("users")
      .insert({ username, password_hash: sha256(password) });

    if (error) {
      if (String(error.message || "").toLowerCase().includes("duplicate")) {
        return json(res, 400, { error: "Esse username já existe." });
      }
      throw error;
    }

    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { error: e?.message || "Erro interno" });
  }
}