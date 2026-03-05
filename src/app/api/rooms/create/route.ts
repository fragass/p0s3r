import { NextResponse } from "next/server";
import { getUserFromRequestToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isValidRoomName(name: string) {
  return /^[a-zA-Z0-9_]{3,}$/.test(name);
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  const user = await getUserFromRequestToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name } = await req.json();
    const roomName = String(name || "").trim();

    if (!isValidRoomName(roomName)) {
      return NextResponse.json(
        { error: "Nome da sala inválido. Use letras/números e pelo menos 3 caracteres." },
        { status: 400 }
      );
    }

    const { data: room, error } = await supabaseAdmin
      .from("rooms")
      .insert({ name: roomName, created_by: user.id })
      .select("id, name")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabaseAdmin.from("room_members").upsert({ room_id: room.id, user_id: user.id });

    return NextResponse.json({ room });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 400 });
  }
}
