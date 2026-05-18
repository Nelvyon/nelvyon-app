import { NextResponse } from "next/server";

/** Paddle desactivado (MIG 308). Usar POST /api/webhooks/stripe. */
export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Paddle billing is disabled. Configure Stripe webhooks at /api/webhooks/stripe." },
    { status: 410 },
  );
}
