import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let _client = null;

export async function getSupabase() {
  if (_client) return _client;

  const res = await fetch("/api/config");
  const cfg = await res.json();

  if (!cfg?.url || !cfg?.anon) {
    throw new Error("Config Supabase ausente. Verifique env vars no Vercel.");
  }

  _client = createClient(cfg.url, cfg.anon);
  return _client;
}