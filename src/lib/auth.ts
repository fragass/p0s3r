import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hoursFromNow, isValidUsername } from "@/lib/utils";

const DEFAULT_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 24 * 7);

export type AuthedUser = { id: string; username: string };

export async function registerUser(usernameRaw: string, password: string) {
  const username = usernameRaw.trim();
  if (!isValidUsername(username)) throw new Error("Nome de usuário inválido.");
  if (password.length < 4) throw new Error("Senha muito curta.");

  const password_hash = await bcrypt.hash(password, 10);

  const { data: created, error } = await supabaseAdmin
    .from("users")
    .insert({ username, password_hash })
    .select("id, username")
    .single();

  if (error) {
    if (String(error.message).toLowerCase().includes("duplicate")) {
      throw new Error("Esse usuário já existe.");
    }
    throw new Error(error.message);
  }

  const token = await createSession(created.id);
  return { token, user: created as AuthedUser };
}

export async function loginUser(usernameRaw: string, password: string) {
  const username = usernameRaw.trim();

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, username, password_hash")
    .eq("username", username)
    .single();

  if (error || !user) throw new Error("Usuário ou senha inválidos.");

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error("Usuário ou senha inválidos.");

  const token = await createSession(user.id);
  return { token, user: { id: user.id, username: user.username } as AuthedUser };
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires_at = hoursFromNow(DEFAULT_TTL_HOURS);

  const { error } = await supabaseAdmin.from("sessions").insert({
    token,
    user_id: userId,
    expires_at
  });

  if (error) throw new Error(error.message);
  return token;
}

export async function getUserFromRequestToken(token: string | null): Promise<AuthedUser | null> {
  if (!token) return null;

  const { data: session, error: sErr } = await supabaseAdmin
    .from("sessions")
    .select("token, user_id, expires_at")
    .eq("token", token)
    .single();

  if (sErr || !session) return null;

  const exp = new Date(session.expires_at).getTime();
  if (Date.now() > exp) {
    await supabaseAdmin.from("sessions").delete().eq("token", token);
    return null;
  }

  const { data: user, error: uErr } = await supabaseAdmin
    .from("users")
    .select("id, username")
    .eq("id", session.user_id)
    .single();

  if (uErr || !user) return null;
  return user as AuthedUser;
}

export async function deleteSession(token: string) {
  await supabaseAdmin.from("sessions").delete().eq("token", token);
}
