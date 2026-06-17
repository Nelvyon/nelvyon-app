import { NextResponse } from "next/server";

import { getAuthService } from "@nelvyon/auth";

import {
  getAgentCatalogStats,
  getAgentsByDiscipline,
  getConnectorStats,
  getConnectorsByStatus,
  getOsCoreHealth,
  getProcessTemplateStats,
  getProcessTemplatesByCategory,
  OS_AGENT_CATALOG,
  OS_CONNECTOR_REGISTRY,
  OS_PROCESS_TEMPLATES,
} from "@/lib/os-core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** Internal OS catalog — requires authenticated operator (not public). */
export async function GET(req: Request) {
  try {
    const auth = getAuthService();
    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      req.headers.get("cookie")?.match(/nelvyon_token=([^;]+)/)?.[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
    }
    await auth.verifyToken(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "summary";

  if (view === "agents") {
    const discipline = searchParams.get("discipline");
    const agents = discipline
      ? getAgentsByDiscipline(discipline as Parameters<typeof getAgentsByDiscipline>[0])
      : OS_AGENT_CATALOG;
    return NextResponse.json({ agents, stats: getAgentCatalogStats() }, { headers: NO_STORE });
  }

  if (view === "templates") {
    const category = searchParams.get("category");
    const templates = category
      ? getProcessTemplatesByCategory(category as Parameters<typeof getProcessTemplatesByCategory>[0])
      : OS_PROCESS_TEMPLATES;
    return NextResponse.json({ templates, stats: getProcessTemplateStats() }, { headers: NO_STORE });
  }

  if (view === "connectors") {
    const status = searchParams.get("status");
    const connectors = status
      ? getConnectorsByStatus(status as Parameters<typeof getConnectorsByStatus>[0])
      : OS_CONNECTOR_REGISTRY;
    return NextResponse.json({ connectors, stats: getConnectorStats() }, { headers: NO_STORE });
  }

  return NextResponse.json(getOsCoreHealth(), { headers: NO_STORE });
}
