import { supabaseAdmin } from "./_supabase.js";
import { json, getBody, requireSession } from "./_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    const { user } = await requireSession(req);

    const body = getBody(req);
    const threadId = String(body.thread_id || "");
    const username = String(body.username || "").trim().toLowerCase();

    if (!threadId) return json(res, 400, { error: "thread_id obrigatório." });
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return json(res, 400, { error: "Username inválido." });

    const { data: t, error: te } = await supabaseAdmin
      .from("threads")
      .select("id,type")
      .eq("id", threadId)
      .maybeSingle();
    if (te) throw te;
    if (!t || t.type !== "group") return json(res, 400, { error: "Grupo inválido." });

    const { data: my, error: me } = await supabaseAdmin
      .from("thread_members")
      .select("role")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (me) throw me;
    if (!my || my.role !== "owner") return json(res, 403, { error: "Apenas owner pode adicionar." });

    const { data: u, error: ue } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (ue) throw ue;
    if (!u) return json(res, 400, { error: "Usuário não encontrado." });

    const { error: ie } = await supabaseAdmin
      .from("thread_members")
      .upsert({ thread_id: threadId, user_id: u.id, role: "member" });

    if (ie) throw ie;

    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { error: e?.message || "Erro interno" });
  }
}
