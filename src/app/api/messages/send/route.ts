import { NextResponse } from "next/server";
import { getUserFromRequestToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  const user = await getUserFromRequestToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId, content } = await req.json();
  const room_id = String(roomId || "");
  const text = String(content || "").trim();

  if (!room_id) return NextResponse.json({ error: "roomId required" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });

  const { error } = await supabaseAdmin.from("messages").insert({
    room_id,
    user_id: user.id,
    content: text,
    image_url: null
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
