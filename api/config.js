export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return res.status(500).json({
      error: "Missing env vars on serverless runtime",
      missing: {
        NEXT_PUBLIC_SUPABASE_URL: !url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !anon
      }
    });
  }

  return res.status(200).json({ url, anon });
}

