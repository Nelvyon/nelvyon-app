import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ objects: [] });
}

export async function POST() {
  return NextResponse.json({ ok: true });
}
