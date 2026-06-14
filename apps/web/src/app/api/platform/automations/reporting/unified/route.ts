import { NextResponse } from "next/server";

import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import {
  EMPTY_EXECUTIONS_LIST,
  EMPTY_RULES_LIST,
  EMPTY_STATS,
  EMPTY_UNIFIED_AUTOMATIONS,
  EMPTY_WORKFLOWS_LIST,
  mergeUnifiedAutomations,
} from "@/lib/automationsBffRoute";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function safeJson(res: Response, fallback: unknown) {
  if (!res.ok) return fallback;
  try {
    return await res.json();
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(EMPTY_UNIFIED_AUTOMATIONS);
  }
  if (claims instanceof NextResponse) return claims;

  try {
    const [workflowsRes, rulesRes, statsRes, executionsRes] = await Promise.all([
      proxyPlatformFetch(req, "GET", "/api/workflows"),
      proxyPlatformFetch(req, "GET", "/api/v1/workflow-engine/rules"),
      proxyPlatformFetch(req, "GET", "/api/v1/automation/stats"),
      proxyPlatformFetch(req, "GET", "/api/v1/workflow-engine/executions"),
    ]);

    const workflows = (await safeJson(workflowsRes, EMPTY_WORKFLOWS_LIST)) as typeof EMPTY_WORKFLOWS_LIST;
    const rules = (await safeJson(rulesRes, EMPTY_RULES_LIST)) as typeof EMPTY_RULES_LIST;
    const stats = (await safeJson(statsRes, EMPTY_STATS)) as typeof EMPTY_STATS;
    const executions = (await safeJson(executionsRes, EMPTY_EXECUTIONS_LIST)) as typeof EMPTY_EXECUTIONS_LIST;

    if (!workflowsRes.ok && upstreamFailed(workflowsRes.status) && !rulesRes.ok) {
      return NextResponse.json(EMPTY_UNIFIED_AUTOMATIONS);
    }

    return NextResponse.json(
      mergeUnifiedAutomations(
        workflows as { items?: Array<{ is_active?: boolean; runs_count?: number }>; total?: number },
        rules as { items?: Array<{ is_active?: boolean; runs_count?: number }>; total?: number },
        stats as { total_jobs?: number; completed?: number; failed?: number; success_rate?: number },
        executions as { items?: unknown[]; total?: number },
      ),
    );
  } catch {
    return NextResponse.json(EMPTY_UNIFIED_AUTOMATIONS);
  }
}
