export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getPrivateAiMetricsSnapshot,
  isSharedMemoryEnabled,
  getSharedMemoryConfig,
  isOrchestratorEnabled,
  isOpenClawRuntimeAuthorized,
  preferLocalRag,
  getOpenClawBridge,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    const metrics = getPrivateAiMetricsSnapshot();
    return NextResponse.json({
      ...metrics,
      flags: {
        sharedMemory: isSharedMemoryEnabled(),
        sharedMemoryConfig: getSharedMemoryConfig(),
        orchestrator: isOrchestratorEnabled(),
        openClawAuthorized: isOpenClawRuntimeAuthorized(),
        openClawBridge: getOpenClawBridge().status(),
        ragPreferLocal: preferLocalRag(),
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
