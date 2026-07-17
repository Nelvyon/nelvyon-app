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

export type UnifiedAgentRecord = {
  id: string;
  name: string;
  source: "private_ai" | "specialist_design" | "both";
  runtimeReady: boolean;
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

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function getUnifiedAgent(id: string): UnifiedAgentRecord | null {
  return listUnifiedAgents().find((a) => a.id === id) ?? null;
}

export function agentRegistryStatus() {
  const all = listUnifiedAgents();
  return {
    contractVersion: "1.0.0",
    total: all.length,
    runtimeReady: all.filter((a) => a.runtimeReady).length,
    designOnly: all.filter((a) => !a.runtimeReady).length,
    privateAiCount: listPrivateAgents().length,
    specialistDesignCount: listSpecialistAgentIds().length,
    ids: all.map((a) => a.id),
  };
}

export { getPrivateAgent, getSpecialistAgentDesign, listPrivateAgents, listSpecialistAgentIds };
