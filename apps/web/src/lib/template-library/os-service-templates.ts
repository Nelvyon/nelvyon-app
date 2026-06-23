/**
 * OS-internal template resolution namespace.
 * Autonomous pipelines, premium agents and builders use ONLY this module.
 */
import { matchSeedForLayer } from "./seed-download-catalog";
import { getOsCapability, OS_CAPABILITIES, type OsCapabilityDef } from "./service-layers";
import type { SeedCatalogEntry } from "./seed-download-catalog";

export type OsTemplateMatch = {
  os_capability_id: string;
  os_capability_label: string;
  sector: string;
  kind: string;
  layer: "os" | "both";
  seed: SeedCatalogEntry;
};

export function listOsCapabilities(): OsCapabilityDef[] {
  return OS_CAPABILITIES;
}

export function resolveOsCapabilityTemplate(input: {
  os_capability_id: string;
  sector: string;
  kind: string;
}): OsTemplateMatch | null {
  const cap = getOsCapability(input.os_capability_id);
  if (!cap) return null;
  const seed = matchSeedForLayer("os", input.sector, input.os_capability_id, input.kind);
  const layer = cap.dual_saas_id ? ("both" as const) : ("os" as const);
  return {
    os_capability_id: cap.id,
    os_capability_label: cap.label,
    sector: input.sector,
    kind: input.kind,
    layer,
    seed,
  };
}

export function resolveOsPremiumTemplate(input: {
  os_premium_id: string;
  sector: string;
  kind: string;
}): OsTemplateMatch | null {
  const cap = OS_CAPABILITIES.find((c) => c.os_premium_id === input.os_premium_id);
  if (!cap) return null;
  return resolveOsCapabilityTemplate({
    os_capability_id: cap.id,
    sector: input.sector,
    kind: input.kind,
  });
}

export function resolveAutonomousPipelineTemplates(input: {
  sku: "NELVYON-LANDING" | "NELVYON-SEO" | "NELVYON-CHATBOT";
  sector: string;
}): OsTemplateMatch[] {
  const capMap = {
    "NELVYON-LANDING": "cap_autonomous_landing_pipeline",
    "NELVYON-SEO": "cap_autonomous_seo_pipeline",
    "NELVYON-CHATBOT": "cap_autonomous_chatbot_pipeline",
  } as const;
  const capId = capMap[input.sku];
  const cap = getOsCapability(capId);
  if (!cap) return [];
  return cap.kinds
    .map((kind) =>
      resolveOsCapabilityTemplate({ os_capability_id: capId, sector: input.sector, kind }),
    )
    .filter((m): m is OsTemplateMatch => m !== null);
}
