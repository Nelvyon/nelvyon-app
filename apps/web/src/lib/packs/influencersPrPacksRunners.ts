/**
 * Runner for the influencers/PR OS pack.
 * Dedicated mappers + pack-specific deliverables · QA>=85 · no silent mocks.
 * Flag defaults OFF outside staging/dev — see `osPackFlags.ts` (NELVYON_INFLUENCERS_PR_PACK).
 * NO real outreach send — `outreach_authorized` is hardcoded `false` in every artifact.
 */
import type { BetaPackIntake, PackRunRecord } from "@/lib/packs/types";
import { INFLUENCERS_PR_PACK_ID } from "@/lib/packs/types";
import { dbCreatePackDeliverable } from "@/lib/packs/packOsDb";
import { avgQa, runCertifiedBetaPack, validateBetaPackIntake } from "@/lib/packs/betaPacksRunners";
import {
  buildInfluencersPrArtifacts,
  mapInfluencersPrSkuDeliverable,
} from "@/lib/packs/influencersPrPackProduction";

type RunParams = {
  workspaceId: number;
  userId: string;
  intake: BetaPackIntake;
  idempotencyKey?: string;
  onRunCreated?: (run: PackRunRecord) => void;
};

const INFLUENCERS_PR_SECTORS = ["local", "ecommerce", "saas_b2b"];

export function validateInfluencersPrIntake(b: unknown) {
  return validateBetaPackIntake(b, INFLUENCERS_PR_SECTORS);
}

export function runInfluencersPrPack(p: RunParams) {
  return runCertifiedBetaPack(INFLUENCERS_PR_PACK_ID, p, {
    campaignType: "influencers_pr",
    mapSku: (x) =>
      mapInfluencersPrSkuDeliverable({
        sku: x.sku,
        simulation: x.simulation,
        intake: x.intake as BetaPackIntake,
        packRunId: x.packRunId,
        osClientId: x.osClientId,
        osProjectId: x.osProjectId,
        workspaceId: x.workspaceId,
      }),
    nextSteps: [
      "Validar candidatos con investigación manual real antes de cualquier contacto",
      "Revisión legal del brief de outreach y del checklist de contrato",
      "Sin envío de outreach hasta autorización explícita CEO + Legal",
      "Definir presupuesto real con CEO antes de negociar cualquier colaboración",
    ],
    onComplete: async (ctx) => {
      const score = avgQa(ctx.skuResults);
      const art = buildInfluencersPrArtifacts(ctx.intake, score);
      const common = {
        workspaceId: ctx.workspaceId,
        clientId: ctx.osClientId,
        projectId: ctx.osProjectId,
        visibility: "client_visible" as const,
      };
      const metaBase = {
        pack_id: INFLUENCERS_PR_PACK_ID,
        pack_run_id: ctx.packRunId,
        production: true,
        qa_score: score,
        outreach_authorized: false,
      };
      await dbCreatePackDeliverable({
        ...common,
        title: "Research matching",
        type: "json",
        metadata: { ...metaBase, research_matching: art.research_matching },
      });
      await dbCreatePackDeliverable({
        ...common,
        title: "Scoring sheet",
        type: "json",
        metadata: { ...metaBase, scoring_sheet: art.scoring_sheet },
      });
      await dbCreatePackDeliverable({
        ...common,
        title: "Brief outreach",
        type: "json",
        metadata: { ...metaBase, brief_outreach: art.brief_outreach },
      });
      await dbCreatePackDeliverable({
        ...common,
        title: "Contrato / checklist",
        type: "json",
        metadata: { ...metaBase, contract_checklist: art.contract_checklist },
      });
      await dbCreatePackDeliverable({
        ...common,
        title: "Metrics plan",
        type: "json",
        metadata: { ...metaBase, metrics_plan: art.metrics_plan },
      });
      return {
        extraDeliverables: 5,
        markSteps: [
          {
            key: "influencers_pr",
            status: "done" as const,
            detail: "Research + scoring + brief outreach + contrato + métricas",
          },
        ],
      };
    },
  });
}
