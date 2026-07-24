/**
 * Runners for the automations + reputation OS packs (ADR-055).
 * Dedicated mappers + pack-specific deliverables · QA>=85 · no silent mocks.
 * Flags default OFF outside staging/dev — see `osPackFlags.ts`
 * (NELVYON_AUTOMATIONS_OPS_PACK / NELVYON_REPUTATION_OPS_PACK).
 */
import type { BetaPackIntake, PackRunRecord } from "@/lib/packs/types";
import { AUTOMATIONS_OPS_PACK_ID, REPUTATION_OPS_PACK_ID } from "@/lib/packs/types";
import { dbCreatePackDeliverable } from "@/lib/packs/packOsDb";
import { avgQa, runCertifiedBetaPack, validateBetaPackIntake } from "@/lib/packs/betaPacksRunners";
import {
  buildAutomationsOpsArtifacts,
  buildReputationOpsArtifacts,
  mapAutomationsOpsSkuDeliverable,
  mapReputationOpsSkuDeliverable,
} from "@/lib/packs/automationsReputationPackProduction";

type RunParams = {
  workspaceId: number;
  userId: string;
  intake: BetaPackIntake;
  idempotencyKey?: string;
  onRunCreated?: (run: PackRunRecord) => void;
};

const OPS_SECTORS = ["local", "ecommerce", "saas_b2b"];

export function validateAutomationsOpsIntake(b: unknown) {
  return validateBetaPackIntake(b, OPS_SECTORS);
}

export function runAutomationsOpsPack(p: RunParams) {
  return runCertifiedBetaPack(AUTOMATIONS_OPS_PACK_ID, p, {
    campaignType: "automations",
    mapSku: (x) =>
      mapAutomationsOpsSkuDeliverable({
        sku: x.sku,
        simulation: x.simulation,
        intake: x.intake as BetaPackIntake,
        packRunId: x.packRunId,
        osClientId: x.osClientId,
        osProjectId: x.osProjectId,
        workspaceId: x.workspaceId,
      }),
    nextSteps: [
      "Revisar mapa de workflows con el equipo de operaciones",
      "Activar triggers en staging antes de producción",
      "Confirmar owners humanos por workflow",
      "Sin envío de campañas masivas hasta autorización CEO/Legal",
    ],
    onComplete: async (ctx) => {
      const score = avgQa(ctx.skuResults);
      const art = buildAutomationsOpsArtifacts(ctx.intake, score);
      const common = {
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        visibility: "client_visible" as const,
      };
      const metaBase = {
        pack_id: AUTOMATIONS_OPS_PACK_ID,
        pack_run_id: ctx.packRunId,
        production: true,
        qa_score: score,
      };
      await dbCreatePackDeliverable({
        ...common,
        title: "Mapa de workflows",
        type: "json",
        metadata: { ...metaBase, workflow_map: art.workflow_map },
      });
      await dbCreatePackDeliverable({
        ...common,
        title: "Playbook de triggers",
        type: "json",
        metadata: { ...metaBase, trigger_playbook: art.trigger_playbook },
      });
      await dbCreatePackDeliverable({
        ...common,
        title: "Borrador de automatización CRM",
        type: "json",
        metadata: { ...metaBase, crm_automation_draft: art.crm_automation_draft },
      });
      await dbCreatePackDeliverable({
        ...common,
        title: "Checklist QA de operaciones",
        type: "json",
        metadata: { ...metaBase, qa_ops_checklist: art.qa_ops_checklist },
      });
      return {
        extraDeliverables: 4,
        markSteps: [
          { key: "automations_ops", status: "done" as const, detail: "Workflows + triggers + CRM + QA ops" },
        ],
      };
    },
  });
}

export function validateReputationOpsIntake(b: unknown) {
  return validateBetaPackIntake(b, OPS_SECTORS);
}

export function runReputationOpsPack(p: RunParams) {
  return runCertifiedBetaPack(REPUTATION_OPS_PACK_ID, p, {
    campaignType: "reputation",
    mapSku: (x) =>
      mapReputationOpsSkuDeliverable({
        sku: x.sku,
        simulation: x.simulation,
        intake: x.intake as BetaPackIntake,
        packRunId: x.packRunId,
        osClientId: x.osClientId,
        osProjectId: x.osProjectId,
        workspaceId: x.workspaceId,
      }),
    nextSteps: [
      "Conectar fuentes de reseñas reales (Google Business Profile, Facebook)",
      "Validar plantillas con el equipo antes de cualquier respuesta real",
      "Ejecutar plan de recuperación a 30 días",
      "Mass DM permanece prohibido sin excepción",
    ],
    onComplete: async (ctx) => {
      const score = avgQa(ctx.skuResults);
      const art = buildReputationOpsArtifacts(ctx.intake, score);
      const common = {
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        visibility: "client_visible" as const,
      };
      const metaBase = {
        pack_id: REPUTATION_OPS_PACK_ID,
        pack_run_id: ctx.packRunId,
        production: true,
        qa_score: score,
      };
      await dbCreatePackDeliverable({
        ...common,
        title: "Playbook de monitorización de reseñas",
        type: "json",
        metadata: { ...metaBase, review_monitoring_playbook: art.review_monitoring_playbook },
      });
      await dbCreatePackDeliverable({
        ...common,
        title: "Plantillas de respuesta",
        type: "json",
        metadata: { ...metaBase, response_templates: art.response_templates },
      });
      await dbCreatePackDeliverable({
        ...common,
        title: "Plan de recuperación de reputación",
        type: "json",
        metadata: { ...metaBase, reputation_recovery_plan: art.reputation_recovery_plan },
      });
      await dbCreatePackDeliverable({
        ...common,
        title: "Kit de señales de confianza",
        type: "json",
        metadata: { ...metaBase, trust_signals_kit: art.trust_signals_kit },
      });
      return {
        extraDeliverables: 4,
        markSteps: [
          { key: "reputation_ops", status: "done" as const, detail: "Playbook + plantillas + recovery + trust kit" },
        ],
      };
    },
  });
}
