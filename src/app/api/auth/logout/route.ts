import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (token) await deleteSession(token);
  return NextResponse.json({ ok: true });
}
