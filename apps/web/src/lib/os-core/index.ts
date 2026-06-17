import { getAgentCatalogStats } from "./agentCatalog";
import { getConnectorStats } from "./connectorRegistry";
import { getProcessTemplateStats } from "./processTemplateRegistry";
import type { OsHealthSurface } from "./types";

export function getOsCoreHealth(): OsHealthSurface & {
  status: "ok";
  layer: "nelvyon-os-internal";
  version: string;
} {
  const agents = getAgentCatalogStats();
  const templates = getProcessTemplateStats();
  const connectors = getConnectorStats();
  return {
    status: "ok",
    layer: "nelvyon-os-internal",
    version: "1.0.0",
    agentsRegistered: agents.total,
    processTemplates: templates.total,
    connectorsLive: connectors.live + connectors.oauth_ready,
    connectorsStub: connectors.stub + connectors.planned,
  };
}

export * from "./types";
export * from "./agentCatalog";
export * from "./processTemplateRegistry";
export * from "./connectorRegistry";
export * from "./packOsBridge";
