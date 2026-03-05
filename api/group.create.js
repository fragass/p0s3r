import { supabaseAdmin, requireUser, json } from "./_supabaseAdmin.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const user = await requireUser(req);
    const { title, members } = req.body || {};

    const groupTitle = String(title || "").trim();
    if (groupTitle.length < 3) throw new Error("Nome do grupo precisa ter 3+ caracteres.");

    const usernames = Array.isArray(members) ? members : [];
    const cleaned = [...new Set(
      usernames.map(x => String(x || "").trim().toLowerCase()).filter(Boolean)
    )];

    let ids = [];
    if (cleaned.length) {
      const { data: profs, error: pe } = await supabaseAdmin
        .from("profiles")
        .select("id,username")
        .in("username", cleaned);

      if (pe) throw pe;
      ids = (profs || []).map(p => p.id);
    }

    const { data: t, error: te } = await supabaseAdmin
      .from("threads")
      .insert({ type: "group", title: groupTitle, created_by: user.id })
      .select("id,title")
      .single();

    if (te) throw te;

    const rows = [
      { thread_id: t.id, user_id: user.id, role: "owner" },
      ...ids.filter(id => id !== user.id).map(id => ({ thread_id: t.id, user_id: id, role: "member" }))
    ];

    await supabaseAdmin.from("thread_members").upsert(rows);

    return json(res, 200, { thread: { id: t.id, title: t.title } });
  } catch (e) {
    return json(res, 400, { error: e.message || "Erro." });
  }
}