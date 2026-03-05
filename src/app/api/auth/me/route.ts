import { NextResponse } from "next/server";
import { getUserFromRequestToken } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  const user = await getUserFromRequestToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user });
}
