import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const out = await registerUser(String(username || ""), String(password || ""));
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 400 });
  }
}
