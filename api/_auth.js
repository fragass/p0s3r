import crypto from "crypto";
import { supabaseAdmin } from "./_supabase.js";

export function json(res, status, payload) {
  res.status(status).json(payload);
}

export function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export async function requireSession(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new Error("Sem token.");

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("token,user_id,expires_at,users(id,username)")
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Sessão inválida.");
  if (new Date(data.expires_at).getTime() < Date.now()) throw new Error("Sessão expirada.");

  return {
    token: data.token,
    user: { id: data.users.id, username: data.users.username }
  };
}

export function sha256(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

export function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}