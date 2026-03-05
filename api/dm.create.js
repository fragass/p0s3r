export const config = { runtime: "nodejs18.x" };

import { supabaseAdmin, requireUser, json } from "./_supabaseAdmin.js";

function dmKey(a, b) {
  const [x, y] = [a, b].sort();
  return `${x}:${y}`;
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const user = await requireUser(req);
    const body = getBody(req);

    const target = String(body.username || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(target)) throw new Error("Username inválido.");

    const { data: p, error: pe } = await supabaseAdmin
      .from("profiles")
      .select("id,username")
      .eq("username", target)
      .maybeSingle();

    if (pe) throw pe;
    if (!p) throw new Error("Usuário não encontrado.");
    if (p.id === user.id) throw new Error("Você não pode criar DM com você mesmo.");

    const key = dmKey(user.id, p.id);
    let threadId = null;

    const { data: tIns, error: te } = await supabaseAdmin
      .from("threads")
      .insert({ type: "dm", dm_key: key, created_by: user.id })
      .select("id")
      .maybeSingle();

    if (te) {
      // se já existe (unique dm_key), buscar
      const { data: t2, error: t2e } = await supabaseAdmin
        .from("threads")
        .select("id")
        .eq("dm_key", key)
        .maybeSingle();
      if (t2e) throw t2e;
      threadId = t2?.id;
    } else {
      threadId = tIns?.id;
    }

    if (!threadId) throw new Error("Falha ao criar/obter DM.");

    const { error: upErr } = await supabaseAdmin.from("thread_members").upsert([
      { thread_id: threadId, user_id: user.id, role: "owner" },
      { thread_id: threadId, user_id: p.id, role: "member" }
    ]);

    if (upErr) throw upErr;

    return json(res, 200, { thread: { id: threadId } });
  } catch (e) {
    return json(res, 400, { error: e?.message || "Erro." });
  }
}
