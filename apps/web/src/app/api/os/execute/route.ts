import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { captureUnknownApiError } from "@/lib/sentryCapture";
import { createRequestLogger } from "@/lib/serverLogger";
import { REQUEST_ID_HEADER } from "@/lib/security/requestId";
import { getAIResponseHeaders } from "@/lib/aiMetadata";
import { authenticate } from "@nelvyon/auth";
import { AppError, ERROR_MAP, toClientError, type AppErrorPayload } from "@nelvyon/errors";
import { OsOrchestrator, type OsJobPayload, sectorFromServiceId } from "@nelvyon/os-agents";
import { RateLimitExceededError } from "@nelvyon/usage";

import { DunningService } from "../../../../../../../backend/billing/dunningService";
import {
  enrichAgentContext,
  formatContextForPrompt,
} from "../../../../../../../backend/os-agents/contextEnricher";
import {
  QueueClient,
  initOsQueueWorker,
  isAsyncQueueEnabled,
} from "../../../../../../../backend/queue";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function clientJson(payload: AppErrorPayload) {
  return NextResponse.json(
    {
      error: payload.code,
      message: payload.message,
      action: payload.action,
      actionUrl: payload.actionUrl,
    },
    { status: payload.statusCode },
  );
}

export async function POST(req: Request) {
  const requestId = req.headers.get(REQUEST_ID_HEADER)?.trim() || randomUUID();
  let log = createRequestLogger(requestId);

  let claims;
  try {
    claims = await authenticate(req);
  } catch (e: unknown) {
    const p = toClientError(e);
    log.error("os_execute_error", { error: e instanceof Error ? e.message : String(e) }, e instanceof Error ? e : undefined);
    return clientJson(p);
  }

  log = createRequestLogger(requestId, claims.userId);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    log.error("os_execute_error", { error: "invalid JSON body" });
    return clientJson(new AppError("INVALID_INPUT", "El cuerpo de la petición no es JSON válido.").payload);
  }

  if (!isRecord(body)) {
    return clientJson(new AppError("INVALID_INPUT", "El cuerpo debe ser un objeto JSON.").payload);
  }

  const serviceId = body.serviceId;
  const payload = body.payload;

  if (typeof serviceId !== "string" || serviceId.length === 0) {
    return clientJson(new AppError("INVALID_INPUT", "Indica un serviceId válido.").payload);
  }
  if (payload !== undefined && !isRecord(payload)) {
    return clientJson(new AppError("INVALID_INPUT", "El campo payload debe ser un objeto.").payload);
  }

  const sector = sectorFromServiceId(serviceId);
  log.info("os_execute_start", { serviceId, sector, requestId });

  const blocked = await DunningService.getInstance().isAgentExecutionBlocked(claims.tenantId);
  if (blocked) {
    const portal =
      process.env.STRIPE_BILLING_PORTAL_FALLBACK ??
      process.env.STRIPE_CUSTOMER_PORTAL_URL ??
      "https://billing.stripe.com/p/login/test";
    return clientJson({
      ...ERROR_MAP.PAYMENT_REQUIRED,
      message: "Tu cuenta tiene un pago pendiente o está suspendida. Actualiza tu método de pago para ejecutar agentes.",
      actionUrl: portal,
    });
  }

  const clientId = claims.tenantId;
  const jobPayload: OsJobPayload = isRecord(payload) ? (payload as OsJobPayload) : {};

  try {
    const agentContext = await enrichAgentContext(claims.userId, jobPayload);
    jobPayload.realDataContext = formatContextForPrompt(agentContext);
    jobPayload.agentContext = agentContext;
    if (isAsyncQueueEnabled()) {
      initOsQueueWorker();
      const jobId = await QueueClient.getInstance().enqueue({
        userId: claims.userId,
        clientId,
        serviceId,
        payload: jobPayload,
      });
      log.info("os_execute_queued", { jobId, requestId });
      return NextResponse.json({ jobId, status: "pending" }, { status: 202, headers: getAIResponseHeaders() });
    }

    const result = await OsOrchestrator.dispatch({
      serviceId,
      clientId,
      payload: jobPayload,
      userId: claims.userId,
    });

    return NextResponse.json(
      {
        jobId: result.jobId,
        status: result.status,
        message: result.message,
        result: result.result,
      },
      { status: 200, headers: getAIResponseHeaders() },
    );
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      const p = toClientError(error);
      log.error(
        "os_execute_error",
        { error: error.message, requestId },
        error instanceof Error ? error : undefined,
      );
      return clientJson(p);
    }
    const p = toClientError(error);
    log.error(
      "os_execute_error",
      { error: error instanceof Error ? error.message : String(error), requestId },
      error instanceof Error ? error : undefined,
    );
    captureUnknownApiError(error, p.code);
    return clientJson(p);
  }
}
