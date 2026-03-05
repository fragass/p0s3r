import { supabaseAdmin } from "./_supabase.js";
import { json, getBody, requireSession } from "./_auth.js";

function toBuffer(base64) {
  return Buffer.from(base64, "base64");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    const { user } = await requireSession(req);

    const body = getBody(req);
    const filename = String(body.filename || "file.bin").slice(0, 120);
    const contentType = String(body.contentType || "application/octet-stream");
    const dataBase64 = String(body.dataBase64 || "");

    if (!dataBase64) return json(res, 400, { error: "Arquivo vazio." });

    const safeName = filename.replace(/[^\w.\-()\s]/g, "_");
    const path = `${user.id}/${Date.now()}_${safeName}`;
    const buf = toBuffer(dataBase64);

    const { error: upErr } = await supabaseAdmin.storage
      .from("attachments")
      .upload(path, buf, { contentType, upsert: false });

    if (upErr) throw upErr;

    const { data: signed, error: se } = await supabaseAdmin.storage
      .from("attachments")
      .createSignedUrl(path, 60 * 60); // 1h

    if (se) throw se;

    return json(res, 200, { url: signed.signedUrl, name: safeName, type: contentType });
  } catch (e) {
    return json(res, 500, { error: e?.message || "Erro interno" });
  }
}
