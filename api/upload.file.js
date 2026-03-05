import { supabaseAdmin, requireUser, json } from "./_supabaseAdmin.js";

function toBuffer(base64) {
  return Buffer.from(base64, "base64");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const user = await requireUser(req);
    const { filename, contentType, dataBase64 } = req.body || {};

    const name = String(filename || "file.bin").slice(0, 120);
    const type = String(contentType || "application/octet-stream");
    const b64 = String(dataBase64 || "");

    if (!b64) throw new Error("Arquivo vazio.");

    const safeName = name.replace(/[^\w.\-()\s]/g, "_");
    const path = `${user.id}/${Date.now()}_${safeName}`;

    const buf = toBuffer(b64);

    const { error: upErr } = await supabaseAdmin.storage
      .from("attachments")
      .upload(path, buf, { contentType: type, upsert: false });

    if (upErr) throw upErr;

    const { data: signed, error: se } = await supabaseAdmin.storage
      .from("attachments")
      .createSignedUrl(path, 60 * 60); // 1h

    if (se) throw se;

    return json(res, 200, {
      url: signed.signedUrl,
      name: safeName,
      type
    });
  } catch (e) {
    return json(res, 400, { error: e.message || "Erro." });
  }
}