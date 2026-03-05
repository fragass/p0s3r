const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      !SUPABASE_URL && "SUPABASE_URL",
      !SUPABASE_ANON_KEY && "SUPABASE_ANON_KEY",
      !SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY"
    ].filter(Boolean);
    const err = new Error("Supabase env faltando: " + missing.join(", "));
    err.status = 500;
    throw err;
  }
}

function admin() {
  requireEnv();
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function ttlIsoHours(hours) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

async function getUserFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const sb = admin();
  const { data: session } = await sb.from("sessions").select("token,user_id,expires_at").eq("token", token).maybeSingle();
  if (!session) return null;

  if (Date.now() > new Date(session.expires_at).getTime()) {
    await sb.from("sessions").delete().eq("token", token);
    return null;
  }

  const { data: user } = await sb.from("users").select("id,username").eq("id", session.user_id).maybeSingle();
  if (!user) return null;
  return { token, user };
}

module.exports = { admin, makeToken, ttlIsoHours, getUserFromToken };
