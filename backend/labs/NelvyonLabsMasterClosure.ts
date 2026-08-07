/**
 * NELVYON Labs — master closure certification runtime.
 * Proves 461/461 definitive decisions + knowledge harvest + capability registry.
 */

import { assertCapabilityRegistryComplete } from "./NelvyonLabsCapabilityRegistry";
import { assertKnowledgeHarvestComplete } from "./NelvyonLabsKnowledgeHarvest";
import { assertLabsOptionalContracts } from "./NelvyonLabsOptionalAdapter";
import decisionsDoc from "../../docs/nelvyon-labs-decisions.json";

export type LabsDecisionState =
  | "INTEGRADO COMO GANADOR"
  | "INTEGRADO PARCIALMENTE"
  | "CONOCIMIENTO/PATRÓN APROVECHADO"
  | "SUSTITUIDO POR SOLUCIÓN YA EXISTENTE"
  | "DESCARTADO POR DUPLICIDAD"
  | "DESCARTADO POR LICENCIA"
  | "DESCARTADO POR INCOMPATIBILIDAD"
  | "DESCARTADO CON EVIDENCIA";

const VALID_STATES = new Set<LabsDecisionState>([
  "INTEGRADO COMO GANADOR",
  "INTEGRADO PARCIALMENTE",
  "CONOCIMIENTO/PATRÓN APROVECHADO",
  "SUSTITUIDO POR SOLUCIÓN YA EXISTENTE",
  "DESCARTADO POR DUPLICIDAD",
  "DESCARTADO POR LICENCIA",
  "DESCARTADO POR INCOMPATIBILIDAD",
  "DESCARTADO CON EVIDENCIA",
]);

export type MasterClosureReport = {
  ok: boolean;
  totalProjects: number;
  pending: number;
  decisionCounts: Record<string, number>;
  knowledgeHarvested: number;
  capabilityDomains: number;
  openClawBlocked: boolean;
  violations: string[];
};

export function assertMasterClosure(): MasterClosureReport {
  const violations: string[] = [];
  const decisions = (decisionsDoc as { decisions: Array<{ id: string; decision: string; harvestPatternId?: string }> })
    .decisions;

  if (decisions.length !== 461) violations.push(`project_count:${decisions.length}`);

  let pending = 0;
  const decisionCounts: Record<string, number> = {};
  let knowledgeWithoutHarvest = 0;

  for (const row of decisions) {
    if (!VALID_STATES.has(row.decision as LabsDecisionState)) {
      pending++;
      violations.push(`invalid_decision:${row.id}:${row.decision}`);
    }
    decisionCounts[row.decision] = (decisionCounts[row.decision] || 0) + 1;
    if (row.decision === "CONOCIMIENTO/PATRÓN APROVECHADO" && !row.harvestPatternId) {
      knowledgeWithoutHarvest++;
    }
  }

  if (pending > 0) violations.push(`pending:${pending}`);
  if (knowledgeWithoutHarvest > 0) violations.push(`knowledge_without_harvest:${knowledgeWithoutHarvest}`);

  const harvest = assertKnowledgeHarvestComplete(138);
  if (!harvest.ok) violations.push(...harvest.violations);

  const registry = assertCapabilityRegistryComplete();
  if (!registry.ok) violations.push(...registry.violations);

  const optional = assertLabsOptionalContracts();
  if (!optional.ok) violations.push(...optional.violations);

  const openClawBlocked = process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED !== "1";

  return {
    ok: violations.length === 0,
    totalProjects: decisions.length,
    pending,
    decisionCounts,
    knowledgeHarvested: harvest.total,
    capabilityDomains: registry.domainCount,
    openClawBlocked,
    violations,
  };
}

export const MASTER_CLOSURE_DECLARATION =
  "BLOQUE MAESTRO NELVYON-LABS COMPLETADO — 461/461 aprovechados sin vendor copy";
