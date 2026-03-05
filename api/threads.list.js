import { supabaseAdmin, requireUser, json } from "./_supabaseAdmin.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

    const user = await requireUser(req);

    const { data: tms, error: tme } = await supabaseAdmin
      .from("thread_members")
      .select("thread_id")
      .eq("user_id", user.id);

    if (tme) throw tme;

    const ids = (tms || []).map(x => x.thread_id);
    if (ids.length === 0) return json(res, 200, { threads: [] });

    const { data: threads, error: te } = await supabaseAdmin
      .from("threads")
      .select("id,type,title,created_at")
      .in("id", ids);

    if (te) throw te;

    const { data: members, error: me } = await supabaseAdmin
      .from("thread_members")
      .select("thread_id,user_id,profiles:profiles(username)")
      .in("thread_id", ids);

    if (me) throw me;

    const { data: lastMsgs, error: le } = await supabaseAdmin
      .from("messages")
      .select("thread_id, body, attachment_name, created_at")
      .in("thread_id", ids)
      .order("created_at", { ascending: false });

    if (le) throw le;

    const lastBy = new Map();
    for (const m of (lastMsgs || [])) {
      if (!lastBy.has(m.thread_id)) lastBy.set(m.thread_id, m);
    }

    const out = (threads || []).map(t => {
      let title = "Chat";

      if (t.type === "group") {
        title = t.title || "Grupo";
      } else {
        const mems = (members || []).filter(m => m.thread_id === t.id);
        const other = mems.find(m => m.user_id !== user.id);
        title = other?.profiles?.username ? `@${other.profiles.username}` : "DM";
      }

      const last = lastBy.get(t.id);
      const preview = last?.body || (last?.attachment_name ? `📎 ${last.attachment_name}` : "");
      const time = last?.created_at
        ? new Date(last.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "";

      return { id: t.id, type: t.type, title, last_preview: preview, last_time: time };
    });

    out.sort((a, b) => (b.last_time || "").localeCompare(a.last_time || ""));
    return json(res, 200, { threads: out });
  } catch (e) {
    return json(res, 400, { error: e?.message || "Erro." });
  }
}

