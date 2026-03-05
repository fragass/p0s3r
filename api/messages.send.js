import { supabaseAdmin, requireUser, json } from "./_supabaseAdmin.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const user = await requireUser(req);
    const { thread_id, body, attachment_url, attachment_name, attachment_type } = req.body || {};

    const threadId = String(thread_id || "");
    if (!threadId) throw new Error("thread_id obrigatório.");
    if (!body && !attachment_url) throw new Error("Mensagem vazia.");

    const { data: mem, error: me } = await supabaseAdmin
      .from("thread_members")
      .select("thread_id")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (me) throw me;
    if (!mem) throw new Error("Sem acesso ao chat.");

    const { error } = await supabaseAdmin.from("messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      body: body || null,
      attachment_url: attachment_url || null,
      attachment_name: attachment_name || null,
      attachment_type: attachment_type || null
    });

    if (error) throw error;

    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 400, { error: e.message || "Erro." });
  }
}