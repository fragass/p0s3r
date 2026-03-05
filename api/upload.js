const { createClient } = require("@supabase/supabase-js");
const formidable = require("formidable");
const fs = require("fs");
const { getUserFromToken } = require("./_lib");

module.exports.config = { api: { bodyParser: false } };

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const out = await getUserFromToken(req);
  if (!out) return res.status(401).json({ error: "Unauthorized" });

  const form = new formidable.IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Erro ao processar upload" });

    try {
      let file = files.file;
      if (Array.isArray(file)) file = file[0];
      if (!file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

      let fileName = fields.fileName;
      if (Array.isArray(fileName)) fileName = fileName[0];

      if (!fileName) fileName = `${Date.now()}-${file.originalFilename}`;

      const fileData = fs.readFileSync(file.filepath);

      const bucket = process.env.SUPABASE_UPLOAD_BUCKET || "uploads";
      const path = `chat/${fileName}`;

      const { error } = await supabase.storage.from(bucket).upload(path, fileData, {
        contentType: file.mimetype || "application/octet-stream",
        upsert: true
      });

      if (error) return res.status(500).json({ error: error.message });

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      return res.status(200).json({ url: pub.publicUrl });
    } catch (e) {
      return res.status(500).json({ error: "Erro no upload" });
    }
  });
};
