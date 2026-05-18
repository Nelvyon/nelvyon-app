import { NextResponse } from "next/server";

import { EarlyAdopterService } from "../../../../../../../backend/billing/earlyAdopterService";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const service = EarlyAdopterService.getInstance();
  const status = await service.getEarlyAdopterStatus();
  return NextResponse.json(
    {
      active: status.active,
      slotsLeft: status.slotsLeft,
      expiresAt: status.expiresAt,
      maxSlots: status.maxSlots,
      discountPct: status.discountPct,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
