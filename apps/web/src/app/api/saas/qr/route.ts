import { NextResponse } from "next/server";
const GONE = { error: "Gone — this endpoint is no longer active." };
export async function GET() { return NextResponse.json(GONE, { status: 410 }); }
export async function POST() { return NextResponse.json(GONE, { status: 410 }); }
export async function DELETE() { return NextResponse.json(GONE, { status: 410 }); }
