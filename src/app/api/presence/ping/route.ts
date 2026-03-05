import { NextResponse } from "next/server";
import { getUserFromRequestToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { nowIso } from "@/lib/utils";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  const user = await getUserFromRequestToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabaseAdmin.from("presence").upsert({
    user_id: user.id,
    last_seen: nowIso()
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
