import { NextResponse } from "next/server";

import { addAIMetadataToBody, getAIResponseHeaders } from "@/lib/aiMetadata";
import { captureUnknownApiError } from "@/lib/sentryCapture";
import { AppError, toClientError } from "@nelvyon/errors";
import { OsOrchestrator } from "@nelvyon/os-agents";
import { RateLimitExceededError } from "@nelvyon/usage";

import { saasPublicApiService } from "../../../../../../../../../backend/saas/SaasPublicApiService";
import { authenticateApiKeyAppRouter } from "../../../../../../pages/api/public/v1/_auth";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

function mergeHeaders(
  base: Record<string, string>,
  extra?: Record<string, string>,
): Record<string, string> {
  return extra ? { ...base, ...extra } : { ...base };
}

export async function POST(req: Request) {
  const started = Date.now();
  const gate = await authenticateApiKeyAppRouter(req);
  if (!gate.ok) {
    if ("apiKeyIdForLog" in gate && typeof gate.apiKeyIdForLog === "string") {
      await saasPublicApiService
        .logUsage(gate.apiKeyIdForLog, "/api/public/v1/agents/run", "POST", gate.response.status, Date.now() - started)
        .catch(() => undefined);
    }
    return gate.response;
  }

  const { auth, rateHeaders } = gate;
  let statusCode = 500;

  try {
    const body = await req.json().catch(() => ({}));
    const rec = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    const serviceId = typeof rec.serviceId === "string" ? rec.serviceId : "";
    const payload =
      rec.payload && typeof rec.payload === "object" && !Array.isArray(rec.payload)
        ? (rec.payload as Record<string, unknown>)
        : {};

    if (!serviceId) {
      const p = new AppError("INVALID_INPUT", "Indica un serviceId válido.").payload;
      statusCode = p.statusCode;
      return NextResponse.json(
        { error: p.code, message: p.message, action: p.action, actionUrl: p.actionUrl },
        { status: p.statusCode, headers: rateHeaders },
      );
    }

    const result = await OsOrchestrator.enqueueAndDispatch({
      serviceId,
      clientId: auth.userId,
      payload,
      userId: auth.userId,
    });

    statusCode = 200;
    const aiHeaders = getAIResponseHeaders();
    const jsonBody = addAIMetadataToBody({ result });
    return NextResponse.json(jsonBody, {
      status: 200,
      headers: mergeHeaders(aiHeaders, rateHeaders),
    });
  } catch (e: unknown) {
    if (e instanceof RateLimitExceededError) {
      const p = toClientError(e);
      console.error("[public/v1/agents/run] rate limit:", e);
      statusCode = p.statusCode;
      return NextResponse.json(
        { error: p.code, message: p.message, action: p.action, actionUrl: p.actionUrl },
        { status: p.statusCode, headers: rateHeaders },
      );
    }
    const p = toClientError(e);
    console.error("[public/v1/agents/run] internal error:", e);
    captureUnknownApiError(e, p.code);
    statusCode = p.statusCode;
    return NextResponse.json(
      { error: p.code, message: p.message, action: p.action, actionUrl: p.actionUrl },
      { status: p.statusCode, headers: rateHeaders },
    );
  } finally {
    await saasPublicApiService
      .logUsage(auth.apiKeyId, "/api/public/v1/agents/run", "POST", statusCode, Date.now() - started)
      .catch(() => undefined);
  }
}
