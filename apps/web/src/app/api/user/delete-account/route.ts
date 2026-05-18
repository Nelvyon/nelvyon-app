import { NextRequest, NextResponse } from "next/server";

import { clearNelvyonAuthCookie } from "@/lib/authCookies";
import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DataSubjectService } from "../../../../../../../backend/gdpr/dataSubjectService";

export const runtime = "nodejs";

const REQUIRED = "ELIMINAR MI CUENTA";

export async function POST(req: NextRequest) {
  try {
    const claims = await authenticate(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const confirmation = (body as { confirmation?: unknown }).confirmation;
    if (confirmation !== REQUIRED) {
      return NextResponse.json({ error: "confirmation_required", message: "Texto de confirmación incorrecto." }, { status: 400 });
    }

    const svc = DataSubjectService.getInstance();
    await svc.deleteUserData(claims.userId);

    const res = NextResponse.json({
      success: true,
      message: "Cuenta eliminada. Tus datos serán eliminados en 30 días.",
    });
    clearNelvyonAuthCookie(res);
    return res;
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
