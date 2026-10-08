import { NextResponse } from "next/server";
import { db, persist } from "@/lib/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = db();
  const beat = data.beats.find((b) => b.id === id);
  if (!beat) return NextResponse.json({ error: "Beat not found" }, { status: 404 });
  beat.plays += 1;
  persist("beats");
  return NextResponse.json({ ok: true, plays: beat.plays });
}
