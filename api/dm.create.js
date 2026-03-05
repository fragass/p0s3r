import { supabaseAdmin } from "./_supabase.js";
import { json, getBody, requireSession } from "./_auth.js";

function dmKey(a, b) {
  const [x, y] = [a, b].sort();
  return `${x}:${y}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    const { user } = await requireSession(req);

    const body = getBody(req);
    const username = String(body.username || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return json(res, 400, { error: "Username inválido." });

    const { data: other, error: oe } = await supabaseAdmin
      .from("users")
      .select("id,username")
      .eq("username", username)
      .maybeSingle();

    if (oe) throw oe;
    if (!other) return json(res, 400, { error: "Usuário não encontrado." });
    if (other.id === user.id) return json(res, 400, { error: "Você não pode criar DM com você mesmo." });

    const key = dmKey(user.id, other.id);

    // tenta criar; se já existe, busca
    let threadId = null;
    const { data: ins, error: ie } = await supabaseAdmin
      .from("threads")
      .insert({ type: "dm", dm_key: key, created_by: user.id })
      .select("id")
      .maybeSingle();

    if (ie) {
      const { data: ex, error: ee } = await supabaseAdmin
        .from("threads")
        .select("id")
        .eq("dm_key", key)
        .maybeSingle();
      if (ee) throw ee;
      threadId = ex?.id;
    } else {
      threadId = ins?.id;
    }

    if (!threadId) throw new Error("Falha ao criar/obter DM.");

    const { error: me } = await supabaseAdmin.from("thread_members").upsert([
      { thread_id: threadId, user_id: user.id, role: "owner" },
      { thread_id: threadId, user_id: other.id, role: "member" }
    ]);

    if (me) throw me;

    return json(res, 200, { ok: true, thread: { id: threadId } });
  } catch (e) {
    return json(res, 500, { error: e?.message || "Erro interno" });
  }
}
