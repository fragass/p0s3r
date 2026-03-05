import { supabaseAdmin } from "./_supabase.js";
import { json, requireSession } from "./_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
    const { user } = await requireSession(req);

    const threadId = String(req.query.thread_id || "");
    if (!threadId) return json(res, 400, { error: "thread_id obrigatório." });

    const { data: mem, error: me } = await supabaseAdmin
      .from("thread_members")
      .select("thread_id")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (me) throw me;
    if (!mem) return json(res, 403, { error: "Sem acesso ao chat." });

    const { data: msgs, error: mge } = await supabaseAdmin
      .from("messages")
      .select("id,thread_id,sender_id,body,attachment_url,attachment_name,attachment_type,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (mge) throw mge;

    const senderIds = [...new Set((msgs || []).map(m => m.sender_id))];
    const { data: users, error: ue } = await supabaseAdmin
      .from("users")
      .select("id,username")
      .in("id", senderIds);

    if (ue) throw ue;

    const map = new Map((users || []).map(u => [u.id, u.username]));
    const out = (msgs || []).map(m => ({
      ...m,
      sender_username: map.get(m.sender_id) || null
    }));

    return json(res, 200, { messages: out });
  } catch (e) {
    return json(res, 500, { error: e?.message || "Erro interno" });
  }
}
