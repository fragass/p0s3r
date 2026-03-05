import { supabaseAdmin, requireUser, json } from "./_supabaseAdmin.js";

export default async function handler(req, res){
  try{
    if(req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    const user = await requireUser(req);

    const { thread_id, username } = req.body || {};
    const threadId = String(thread_id || "");
    const u = String(username || "").trim().toLowerCase();
    if(!threadId) throw new Error("thread_id obrigatório.");
    if(!/^[a-z0-9_]{3,20}$/.test(u)) throw new Error("Username inválido.");

    // checa que é group e que user é membro
    const { data: t, error: te } = await supabaseAdmin
      .from("threads")
      .select("id,type")
      .eq("id", threadId)
      .maybeSingle();
    if(te) throw te;
    if(!t) throw new Error("Grupo não existe.");
    if(t.type !== "group") throw new Error("Só dá pra adicionar membros em grupo.");

    const { data: mem, error: me } = await supabaseAdmin
      .from("thread_members")
      .select("role")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .maybeSingle();
    if(me) throw me;
    if(!mem) throw new Error("Sem acesso ao grupo.");

    // (simples) só owner pode adicionar
    if(mem.role !== "owner") throw new Error("Apenas o owner pode adicionar pessoas.");

    const { data: p, error: pe } = await supabaseAdmin
      .from("profiles")
      .select("id,username")
      .eq("username", u)
      .maybeSingle();
    if(pe) throw pe;
    if(!p) throw new Error("Usuário não encontrado.");

    await supabaseAdmin.from("thread_members").upsert({
      thread_id: threadId,
      user_id: p.id,
      role: "member"
    });

    return json(res, 200, { ok: true });
  } catch(e){
    return json(res, 400, { error: e.message || "Erro." });
  }
}