import { supabaseAdmin } from "./_supabase.js";
import { json, getBody, requireSession } from "./_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    const { user } = await requireSession(req);

    const body = getBody(req);
    const threadId = String(body.thread_id || "");
    const text = body.body ? String(body.body) : null;

    const attachment_url = body.attachment_url ? String(body.attachment_url) : null;
    const attachment_name = body.attachment_name ? String(body.attachment_name) : null;
    const attachment_type = body.attachment_type ? String(body.attachment_type) : null;

    if (!threadId) return json(res, 400, { error: "thread_id obrigatório." });
    if (!text && !attachment_url) return json(res, 400, { error: "Mensagem vazia." });

    const { data: mem, error: me } = await supabaseAdmin
      .from("thread_members")
      .select("thread_id")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (me) throw me;
    if (!mem) return json(res, 403, { error: "Sem acesso ao chat." });

    const { error: ie } = await supabaseAdmin.from("messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      body: text,
      attachment_url,
      attachment_name,
      attachment_type
    });

    if (ie) throw ie;

    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { error: e?.message || "Erro interno" });
  }
}
