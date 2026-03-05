import { NextResponse } from "next/server";
import { getUserFromRequestToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  const user = await getUserFromRequestToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const roomId = url.searchParams.get("roomId");
  const afterId = url.searchParams.get("afterId");

  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  let query = supabaseAdmin
    .from("messages")
    .select("id, room_id, user_id, content, image_url, created_at, users(username)")
    .eq("room_id", roomId)
    .order("id", { ascending: true })
    .limit(200);

  if (afterId) query = query.gt("id", Number(afterId));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const messages =
    (data || []).map((m: any) => ({
      id: m.id,
      room_id: m.room_id,
      user_id: m.user_id,
      content: m.content,
      image_url: m.image_url,
      created_at: m.created_at,
      username: m.users?.username || "?"
    })) || [];

  return NextResponse.json({ messages });
}
