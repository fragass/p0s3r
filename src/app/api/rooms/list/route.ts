import { NextResponse } from "next/server";
import { getUserFromRequestToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  const user = await getUserFromRequestToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("id, name")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rooms: data || [] });
}
