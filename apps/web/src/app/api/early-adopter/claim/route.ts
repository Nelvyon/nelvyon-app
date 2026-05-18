import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { EarlyAdopterService } from "../../../../../../../backend/billing/earlyAdopterService";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const claims = await authenticate(req);
    const service = EarlyAdopterService.getInstance();
    const result = await service.claimEarlyAdopterSlot(claims.userId);

    if (!result.claimed) {
      return NextResponse.json(
        { error: "No quedan plazas early adopter", message: "No quedan plazas early adopter" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      discountCode: result.discountCode,
      message: result.discountCode
        ? "Plaza Early Adopter reservada. Aplica el código en el checkout."
        : "Plaza Early Adopter reservada.",
    });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
