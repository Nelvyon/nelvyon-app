import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { CancellationService } from "../../../../../../../backend/billing/cancellationService";

export const runtime = "nodejs";

const VALID_REASONS = new Set(["precio", "no_lo_uso", "faltan_funciones", "competencia", "otro"]);

export async function POST(req: NextRequest) {
  try {
    const claims = await authenticate(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
    }

    const reason = (body as { reason?: unknown }).reason;
    const feedback = (body as { feedback?: unknown }).feedback;

    if (typeof reason !== "string" || !VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: "Motivo de cancelación no válido" }, { status: 400 });
    }

    if (feedback !== undefined && feedback !== null) {
      if (typeof feedback !== "string" || feedback.length > 500) {
        return NextResponse.json({ error: "El comentario no puede superar 500 caracteres" }, { status: 400 });
      }
    }

    const service = CancellationService.getInstance();
    const { periodEnd } = await service.initiateCancellation(
      claims.userId,
      reason,
      typeof feedback === "string" ? feedback : undefined,
    );

    return NextResponse.json({
      success: true,
      periodEnd: periodEnd.toISOString(),
    });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "Error al cancelar";
    console.error("[user/cancel]", e);
    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}
