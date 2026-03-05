import { NextResponse } from "next/server";
import { getUserFromRequestToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  const user = await getUserFromRequestToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 35_000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("presence")
    .select("user_id, last_seen, users(username)")
    .gte("last_seen", since)
    .order("last_seen", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const online =
    (data || []).map((p: any) => ({
      user_id: p.user_id,
      last_seen: p.last_seen,
      username: p.users?.username || "?"
    })) || [];

  return NextResponse.json({ online });
}
