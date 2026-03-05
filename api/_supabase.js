import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const role = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !role) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.");
}

export const supabaseAdmin = createClient(url, role, {
  auth: { persistSession: false }
});
