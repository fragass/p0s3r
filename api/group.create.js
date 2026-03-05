import { supabaseAdmin } from "./_supabase.js";
import { json, getBody, requireSession } from "./_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    const { user } = await requireSession(req);

    const body = getBody(req);
    const title = String(body.title || "").trim();
    const members = Array.isArray(body.members) ? body.members : [];

    if (title.length < 3) return json(res, 400, { error: "Nome do grupo precisa ter 3+ caracteres." });

    const clean = [...new Set(members.map(x => String(x || "").trim().toLowerCase()).filter(Boolean))];

    let ids = [];
    if (clean.length) {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id,username")
        .in("username", clean);

      if (error) throw error;
      ids = (data || []).map(u => u.id);
    }

    const { data: t, error: te } = await supabaseAdmin
      .from("threads")
      .insert({ type: "group", title, created_by: user.id })
      .select("id,title")
      .single();

    if (te) throw te;

    const rows = [
      { thread_id: t.id, user_id: user.id, role: "owner" },
      ...ids.filter(id => id !== user.id).map(id => ({ thread_id: t.id, user_id: id, role: "member" }))
    ];

    const { error: me } = await supabaseAdmin.from("thread_members").upsert(rows);
    if (me) throw me;

    return json(res, 200, { ok: true, thread: { id: t.id, title: t.title } });
  } catch (e) {
    return json(res, 500, { error: e?.message || "Erro interno" });
  }
}
