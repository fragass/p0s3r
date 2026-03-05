import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let _client = null;

export async function getSupabase() {
  if (_client) return _client;

  const res = await fetch("/api/config?t=" + Date.now());
  const cfg = await res.json();

  if (!cfg?.url || !cfg?.anon) {
    throw new Error("Config Supabase ausente. Verifique env vars no Vercel.");
  }

  _client = createClient(cfg.url, cfg.anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return _client;
}
