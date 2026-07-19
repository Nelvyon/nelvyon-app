/**
 * Unified Agent Registry — SSOT over Private AI (17) + specialist design catalog (23).
 * Does not duplicate OS pack agents (os-agents).
 */

import {
  NELVYON_PRIVATE_AGENTS,
  getPrivateAgent,
  listPrivateAgents,
} from "../private-ai/nelvyonAgentRegistry";
import type { NelvyonPrivateAgentDef } from "../private-ai/types";
import {
  SPECIALIST_AGENT_DESIGNS,
  getSpecialistAgentDesign,
  listSpecialistAgentIds,
  type SpecialistAgentDesign,
} from "./specialistCatalog";
import {
  resolveCanonicalAgentId,
  isDeprecatedAgentId,
  getWorkforceProfile,
  effectiveRuntimeAgentId,
  type AgentLifecycleState,
  type AgentHierarchyLevel,
} from "./workforce/hierarchy";

export type UnifiedAgentRecord = {
  id: string;
  name: string;
  source: "private_ai" | "specialist_design" | "both";
  runtimeReady: boolean;
  deprecated?: boolean;
  canonicalId?: string;
  lifecycle?: AgentLifecycleState;
  hierarchyLevel?: AgentHierarchyLevel;
  reportsTo?: string | null;
  effectiveRuntimeId?: string;
  design?: SpecialistAgentDesign;
  runtime?: NelvyonPrivateAgentDef;
};

export function listUnifiedAgents(): UnifiedAgentRecord[] {
  const byId = new Map<string, UnifiedAgentRecord>();

  for (const a of NELVYON_PRIVATE_AGENTS) {
    byId.set(a.id, {
      id: a.id,
      name: a.name,
      source: "private_ai",
      runtimeReady: true,
      runtime: a,
    });
  }

  for (const d of SPECIALIST_AGENT_DESIGNS) {
    const existing = byId.get(d.id);
    if (existing) {
      existing.source = "both";
      existing.design = d;
      existing.name = existing.name || d.name;
    } else {
      byId.set(d.id, {
        id: d.id,
        name: d.name,
        source: "specialist_design",
        runtimeReady: false,
        design: d,
      });
    }
  }

  return [...byId.values()]
    .map((rec) => {
      const canonical = resolveCanonicalAgentId(rec.id);
      const deprecated = isDeprecatedAgentId(rec.id);
      const profile = getWorkforceProfile(canonical);
      return {
        ...rec,
        deprecated,
        canonicalId: deprecated ? canonical : rec.id,
        lifecycle: deprecated ? ("deprecated" as const) : profile?.lifecycle,
        hierarchyLevel: profile?.level,
        reportsTo: profile?.reportsTo,
        effectiveRuntimeId: effectiveRuntimeAgentId(rec.id),
        // Deprecated aliases are never runtimeReady for new work
        runtimeReady: deprecated ? false : rec.runtimeReady,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getUnifiedAgent(id: string): UnifiedAgentRecord | null {
  const canonical = resolveCanonicalAgentId(id);
  return listUnifiedAgents().find((a) => a.id === id || a.id === canonical) ?? null;
}

export function agentRegistryStatus() {
  const all = listUnifiedAgents();
  const active = all.filter((a) => !a.deprecated);
  return {
    contractVersion: "1.1.0",
    total: all.length,
    active: active.length,
    deprecated: all.filter((a) => a.deprecated).length,
    runtimeReady: active.filter((a) => a.runtimeReady).length,
    designOnly: active.filter((a) => !a.runtimeReady).length,
    privateAiCount: listPrivateAgents().length,
    specialistDesignCount: listSpecialistAgentIds().length,
    ids: active.map((a) => a.id),
    deprecatedIds: all.filter((a) => a.deprecated).map((a) => a.id),
  };
}

export { getPrivateAgent, getSpecialistAgentDesign, listPrivateAgents, listSpecialistAgentIds };
