import { NextRequest, NextResponse } from "next/server";

import { validateProductionEnv } from "../../../../../../../../backend/config/prodEnvValidation";
import { runDeepHealthChecks } from "../../../../../../../../backend/health/healthChecks";
import { CRON_JOBS, INBOUND_WEBHOOKS } from "../../../../../../../../backend/monitoring/opsRegistry";
import { getCurrentStatus } from "../../../../../../../../backend/monitoring/statusChecker";
import { verifyCronFlexible } from "@/lib/cronAuth";
import { requirePlatformAdmin } from "@/lib/platformBffAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function gitSha(): string | null {
  const raw =
    process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ||
    process.env.BUILD_GIT_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    null;
  return raw ? raw.slice(0, 12) : null;
}

/** SRE / platform admin ops summary — deep health, status checks, cron registry, env audit. */
export async function GET(req: NextRequest) {
  const denied = verifyCronFlexible(
    req.headers.get("x-cron-secret"),
    req.headers.get("authorization"),
  );
  if (denied) {
    const admin = await requirePlatformAdmin(req);
    if (admin instanceof NextResponse) return admin;
  }

  const [deep, statusPage, env] = await Promise.all([
    runDeepHealthChecks(),
    getCurrentStatus().catch(() => ({})),
    Promise.resolve(validateProductionEnv()),
  ]);

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      gitSha: gitSha(),
      uptimeSec: Math.floor(process.uptime()),
      deepHealth: deep,
      statusPage,
      env,
      crons: CRON_JOBS,
      webhooks: INBOUND_WEBHOOKS,
    },
    { headers: NO_STORE },
  );
}
