import { simulateAutonomousJob } from "../../../../../backend/autonomous/simulator";
import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import { runVisualQa } from "../../../../../backend/autonomous/qa/visualQaEngine";
import { personalizeForSector } from "@/lib/packs/packSeedTemplates";
import { getSeedByIndex } from "@/lib/packs/sectorSeeds";

import type { SimulationResult } from "../../../../../backend/autonomous/types";

import type { PackMeta } from "@/lib/packs/packRegistry";
import {
  dbAutoApprovePackDeliverables,
  dbCreateOsClient,
  dbCreateOsProject,
  dbCreatePackDeliverable,
  type PackDeliverableInput,
} from "@/lib/packs/packOsDb";
import {
  createPackRun,
  getPackRun,
  markStep,
  updatePackRun,
} from "@/lib/packs/packRunStore";
import type {
  GrowthPackIntakeBase,
  PackReport,
  PackRunRecord,
  SkuRunResult,
} from "@/lib/packs/types";

import {
  dbCreateCampaign,
  dbCreateClient,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";

/** Returns true only when AUTONOMOUS_PRODUCTION=true is set in the environment. */
export function isAutonomousProductionEnabled(): boolean {
  return process.env.AUTONOMOUS_PRODUCTION === "true";
}

const SKU_STEP_KEYS: Record<AutonomousSku, string> = {
  "NELVYON-LANDING": "sku_landing",
  "NELVYON-SEO": "sku_seo",
  "NELVYON-CHATBOT": "sku_chatbot",
};

export function slugifyName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function buildBaseBrief(
  intake: GrowthPackIntakeBase & { sector: string },
): Record<string, unknown> {
  const slug = intake.business_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return {
    company_name: intake.business_name,
    sector: intake.sector,
    value_proposition: intake.value_proposition,
    primary_cta: intake.primary_cta,
    cta_type: "form",
    traffic_source: "google_ads",
    target_geo: intake.city,
    locale: "es-ES",
    primary_domain: intake.website_url ?? `https://${slug}.nelvyon-client.test`,
    brand: {
      primary_color: "#0F766E",
      secondary_color: "#F59E0B",
    },
    domain: {
      type: "subdomain",
      host: `${slug}.nelvyon-client.test`,
    },
    tracking: {
      ga4_id: "G-PACK-PLACEHOLDER",
    },
    compliance_flags: {
      regulated_sector: intake.sector === "dental" || intake.sector === "fintech_b2b",
      requires_legal_review: intake.sector === "dental",
    },
  };
}

export type CampaignSpec = {
  platform: string;
  campaign_type: string;
  name: string;
  content: string;
  target_audience: string;
  status: string;
};

export type ExtraDeliverableSpec = {
  stepKey: string;
  title: string;
  type: string;
  metadata: Record<string, unknown>;
};

export type GrowthPackRunConfig<T extends GrowthPackIntakeBase & { sector: string }> = {
  meta: PackMeta;
  intake: T;
  buildBrief: (intake: T) => Record<string, unknown>;
  primaryCampaign: (intake: T) => CampaignSpec;
  extraCampaigns?: Array<{ stepKey: string; spec: (intake: T) => CampaignSpec }>;
  extraDeliverables?: Array<(params: {
    intake: T;
    packRunId: string;
    osClientId: string;
    osProjectId: string;
    workspaceId: number;
  }) => ExtraDeliverableSpec>;
  buildReport: (params: {
    intake: T;
    skuResults: SkuRunResult[];
    saasClientId: number;
    saasCampaignId: number;
    extraCampaignCount: number;
    extraDeliverableCount: number;
    packRunId: string;
    osClientId: string;
    osProjectId: string;
  }) => PackReport;
  projectDescription: (intake: T) => string;
  mapSkuDeliverable?: (params: {
    sku: AutonomousSku;
    simulation: SimulationResult;
    intake: T;
    brief: Record<string, unknown>;
    packRunId: string;
    osClientId: string;
    osProjectId: string;
    workspaceId: number;
    projectSlug: string;
  }) => PackDeliverableInput | null;
  reportDeliverableTitle?: string;
  /** Publish mapSkuDeliverable outputs even when simulator QA did not pass (production packs). */
  publishProductionDeliverables?: boolean;
  /** Minimum QA score to auto-publish without human review (default: 85). */
  autoPublishQaThreshold?: number;
  onPackStepsComplete?: (params: {
    intake: T;
    packRunId: string;
    workspaceId: number;
    userId: string;
    saasClientId: number;
    saasCampaignId: number;
    osClientId: string;
    osProjectId: string;
    skuResults: SkuRunResult[];
  }) => Promise<void>;
};

async function runSkuPipeline<T extends GrowthPackIntakeBase & { sector: string }>(params: {
  sku: AutonomousSku;
  packId: string;
  packRunId: string;
  intake: T;
  userId?: string;
  buildBrief: (intake: T) => Record<string, unknown>;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
  projectSlug: string;
  mapSkuDeliverable?: GrowthPackRunConfig<T>["mapSkuDeliverable"];
  publishProductionDeliverables?: boolean;
  autoPublishQaThreshold?: number;
}): Promise<{ result: SkuRunResult; deliverableIds: string[] }> {
  const brief = params.buildBrief(params.intake);

  // O21 — inject real SEO data (Semrush/DataForSEO) into SEO SKU briefs (best-effort)
  const websiteUrl = (params.intake as Record<string, unknown>).website_url as string | undefined;
  if (params.sku.includes("SEO") && websiteUrl) {
    try {
      const { getOsAgentDataService } = await import(
        "../../../../../backend/saas/OsAgentDataService"
      );
      const svc = getOsAgentDataService();
      const [kw, comp] = await Promise.all([
        svc.fetchKeywordSnapshot({ userId: params.userId, domain: websiteUrl }),
        svc.fetchCompetitorSnapshot({ userId: params.userId, domain: websiteUrl }),
      ]);
      (brief as Record<string, unknown>)._agent_data = {
        provider: kw.provider,
        cached: kw.cached,
        fetched_at: kw.fetchedAt,
        keywords: kw.keywords.slice(0, 20),
        competitors: comp.competitors.slice(0, 5),
      };
    } catch {
      /* agent data is best-effort — never block the pack run */
    }
  }
  const simulation = simulateAutonomousJob({
    sku: params.sku,
    tier: params.intake.tier ?? "professional",
    brief,
    os_refs: {
      client_id: params.osClientId,
      project_slug: params.projectSlug,
      workspace_id: String(params.workspaceId),
    },
  });

  const deliverableIds: string[] = [];
  const qaScore = simulation.project.qa?.score ?? 0;
  const passed = Boolean(simulation.project.qa?.passed && !simulation.escalated);
  const autoPublishThreshold = params.autoPublishQaThreshold ?? 85;
  const meetsThreshold = qaScore >= autoPublishThreshold;

  const shouldPublish =
    passed ||
    meetsThreshold ||
    Boolean(params.publishProductionDeliverables && params.mapSkuDeliverable);

  // Personalize content for this sector — never ship raw templates.
  const personalized = personalizeForSector(params.intake.sector, {
    business_name: params.intake.business_name,
    city: (params.intake as Record<string, unknown>).city as string | undefined,
    value_proposition: (params.intake as Record<string, unknown>).value_proposition as string | undefined,
    primary_cta: (params.intake as Record<string, unknown>).primary_cta as string | undefined,
  });

  // Seed provenance for QA metadata — use structured seed registry when available
  const seed = getSeedByIndex(params.intake.sector, 0);

  // O16 — attach sector readiness score (non-blocking, DB-only lookup)
  let sectorReadinessScore: number | null = null;
  try {
    const { getOsSectorReadinessService } = await import(
      "../../../../../backend/os-agents/sectors/OsSectorReadinessService"
    );
    sectorReadinessScore = await getOsSectorReadinessService().getReadinessScore(params.intake.sector);
  } catch {
    sectorReadinessScore = null;
  }

  const seedMeta = {
    seed_id: seed?.seed_id ?? `${params.intake.sector}_tpl_0`,
    source: "synthetic" as const,
    sector: params.intake.sector,
    prompt_preview: seed?.prompt.slice(0, 80) ?? null,
    sector_readiness_score: sectorReadinessScore,
  };

  if (shouldPublish) {
    const mapped = params.mapSkuDeliverable?.({
      sku: params.sku,
      simulation,
      intake: params.intake,
      brief,
      packRunId: params.packRunId,
      osClientId: params.osClientId,
      osProjectId: params.osProjectId,
      workspaceId: params.workspaceId,
      projectSlug: params.projectSlug,
    });

    if (mapped) {
      // Enrich mapped deliverable with personalized content
      const enriched: PackDeliverableInput = {
        ...mapped,
        metadata: { ...mapped.metadata, personalized_content: personalized ?? undefined, ...seedMeta },
      };
      const id = await dbCreatePackDeliverable(enriched);
      deliverableIds.push(id);
    } else if (simulation.os_publish) {
      for (const d of simulation.os_publish.deliverables) {
        if (d.visibility !== "client") continue;
        const id = await dbCreatePackDeliverable({
          workspaceId: params.workspaceId,
          clientId: params.osClientId,
          projectId: params.osProjectId,
          title: d.label,
          type: d.type,
          file_url: d.type === "url" ? d.value : null,
          visibility: "client_visible",
          metadata: {
            pack_id: params.packId,
            sku: params.sku,
            qa_score: qaScore,
            artifact_value: d.value,
            autonomous_job_id: simulation.os_publish.autonomous_job_id,
            personalized_content: personalized ?? undefined,
            ...seedMeta,
          },
        });
        deliverableIds.push(id);
      }
    } else {
      // Fallback: always write at least one deliverable per SKU with real content.
      // This prevents empty JSON from landing in the DB.
      const skuLabels: Record<string, string> = {
        "NELVYON-LANDING": "Landing Page personalizada",
        "NELVYON-SEO": "Estrategia SEO personalizada",
        "NELVYON-CHATBOT": "Script Chatbot personalizado",
      };
      const id = await dbCreatePackDeliverable({
        workspaceId: params.workspaceId,
        clientId: params.osClientId,
        projectId: params.osProjectId,
        title: skuLabels[params.sku] ?? `Entregable ${params.sku}`,
        type: "document",
        file_url: null,
        visibility: "client_visible",
        metadata: {
          pack_id: params.packId,
          sku: params.sku,
          qa_score: qaScore,
          brief_summary: {
            business_name: params.intake.business_name,
            sector: params.intake.sector,
            value_proposition: (params.intake as Record<string, unknown>).value_proposition ?? null,
          },
          personalized_content: personalized ?? undefined,
          ...seedMeta,
        },
      });
      deliverableIds.push(id);
    }
  }

  // Visual QA — runs offline, no browser needed
  const qaInput = {
    copyText: (params.intake as Record<string, unknown>).value_proposition as string | undefined,
    brandColor: "#0084ff",
    backgroundColor: "#020817",
  };
  const visualQa = runVisualQa(qaInput);

  // O18 — unified QA gate: persist audit run + capture gate status (non-blocking)
  let qaGateStatus: string | undefined;
  try {
    const { getOsVisualQaGateService } = await import(
      "../../../../../backend/autonomous/qa/OsVisualQaGateService"
    );
    const gate = await getOsVisualQaGateService().runAndPersist({
      ...qaInput,
      packRunId: params.packRunId,
      deliverableRef: params.sku,
      workspaceId: params.workspaceId,
    });
    qaGateStatus = gate.gateStatus;
  } catch {
    qaGateStatus = undefined;
  }

  return {
    result: {
      sku: params.sku,
      qa_score: qaScore,
      passed,
      escalated: simulation.escalated,
      deliverable_ids: deliverableIds,
      qa_visual_score: visualQa.score,
      qa_legal_passed: visualQa.legal_passed,
      qa_gate_status: qaGateStatus,
    },
    deliverableIds,
  };
}

export async function runGrowthPack<T extends GrowthPackIntakeBase & { sector: string }>(params: {
  workspaceId: number;
  userId: string;
  config: GrowthPackRunConfig<T>;
}): Promise<PackRunRecord> {
  if (!platformDbFallbackEnabled()) {
    throw new Error("DATABASE_URL requerida para ejecutar el Growth Pack");
  }

  const { config } = params;

  // Guard: publishProductionDeliverables only works when AUTONOMOUS_PRODUCTION=true.
  // This prevents accidental production publishing in staging or local environments.
  if (config.publishProductionDeliverables && !isAutonomousProductionEnabled()) {
    throw new Error(
      "publishProductionDeliverables requiere AUTONOMOUS_PRODUCTION=true. " +
      "Activa la bandera solo tras validar el gate de producción.",
    );
  }
  const { meta, intake } = config;
  let run = await createPackRun({
    workspaceId: params.workspaceId,
    userId: params.userId,
    packId: meta.id,
    intake,
    stepDefinitions: meta.stepDefinitions,
  });

  let steps = run.steps;
  let extraCampaignCount = 0;
  let extraDeliverableCount = 0;

  try {
    const saasClient = await dbCreateClient(params.workspaceId, params.userId, {
      business_name: intake.business_name,
      sector: intake.sector,
      city: intake.city,
      country: intake.country ?? "ES",
      website_url: intake.website_url,
    });
    steps = markStep(steps, "saas_client", "done", `Cliente SaaS #${saasClient.id}`);
    run = (await updatePackRun(run.id, { steps, saas_client_id: Number(saasClient.id) }))!;

    const primary = config.primaryCampaign(intake);
    const campaign = await dbCreateCampaign(params.workspaceId, params.userId, {
      client_id: saasClient.id,
      project_id: saasClient.id,
      ...primary,
    });
    steps = markStep(steps, "saas_campaign", "done", `Campaña #${campaign.id}`);
    run = (await updatePackRun(run.id, { steps, saas_campaign_id: Number(campaign.id) }))!;

    for (const extra of config.extraCampaigns ?? []) {
      const spec = extra.spec(intake);
      const extraCamp = await dbCreateCampaign(params.workspaceId, params.userId, {
        client_id: saasClient.id,
        project_id: saasClient.id,
        ...spec,
      });
      extraCampaignCount += 1;
      steps = markStep(steps, extra.stepKey, "done", `Campaña #${extraCamp.id}`);
      run = (await updatePackRun(run.id, { steps }))!;
    }

    const osClientId = await dbCreateOsClient({
      workspaceId: params.workspaceId,
      userId: params.userId,
      business_name: intake.business_name,
      sector: intake.sector,
      city: intake.city,
      country: intake.country,
      contact_email: intake.contact_email,
      contact_name: intake.contact_name,
      website_url: intake.website_url,
      value_proposition: intake.value_proposition,
    });
    steps = markStep(steps, "os_client", "done", osClientId);
    run = (await updatePackRun(run.id, { steps, os_client_id: osClientId }))!;

    const projectSlug = `${meta.projectPrefix}-${slugifyName(intake.business_name)}`;
    const osProjectId = await dbCreateOsProject({
      workspaceId: params.workspaceId,
      clientId: osClientId,
      name: `${meta.name} — ${intake.business_name}`,
      description: config.projectDescription(intake),
      packRunId: run.id,
      packId: meta.id,
    });
    steps = markStep(steps, "os_project", "done", osProjectId);
    run = (await updatePackRun(run.id, { steps, os_project_id: osProjectId }))!;

    const skuResults: SkuRunResult[] = [];
    for (const sku of meta.skuSequence) {
      const stepKey = SKU_STEP_KEYS[sku];
      steps = markStep(steps, stepKey, "running");
      await updatePackRun(run.id, { steps });

      const { result } = await runSkuPipeline({
        sku,
        packId: meta.id,
        packRunId: run.id,
        intake,
        userId: params.userId,
        buildBrief: config.buildBrief,
        osClientId,
        osProjectId,
        workspaceId: params.workspaceId,
        projectSlug,
        mapSkuDeliverable: config.mapSkuDeliverable,
        publishProductionDeliverables: config.publishProductionDeliverables,
        autoPublishQaThreshold: config.autoPublishQaThreshold,
      });
      skuResults.push(result);
      steps = markStep(
        steps,
        stepKey,
        result.passed ? "done" : "failed",
        `QA ${result.qa_score}${result.escalated ? " — escalado" : ""}`,
      );
      run = (await updatePackRun(run.id, { steps }))!;
    }

    for (const buildExtra of config.extraDeliverables ?? []) {
      const spec = buildExtra({
        intake,
        packRunId: run.id,
        osClientId,
        osProjectId,
        workspaceId: params.workspaceId,
      });
      steps = markStep(steps, spec.stepKey, "running");
      await updatePackRun(run.id, { steps });

      await dbCreatePackDeliverable({
        workspaceId: params.workspaceId,
        clientId: osClientId,
        projectId: osProjectId,
        title: spec.title,
        type: spec.type,
        visibility: "client_visible",
        metadata: spec.metadata,
      });
      extraDeliverableCount += 1;
      steps = markStep(steps, spec.stepKey, "done", spec.title);
      run = (await updatePackRun(run.id, { steps }))!;
    }

    if (config.onPackStepsComplete) {
      await config.onPackStepsComplete({
        intake,
        packRunId: run.id,
        workspaceId: params.workspaceId,
        userId: params.userId,
        saasClientId: Number(saasClient.id),
        saasCampaignId: Number(campaign.id),
        osClientId,
        osProjectId,
        skuResults,
      });
    }

    const report = config.buildReport({
      intake,
      skuResults,
      saasClientId: Number(saasClient.id),
      saasCampaignId: Number(campaign.id),
      extraCampaignCount,
      extraDeliverableCount,
      packRunId: run.id,
      osClientId,
      osProjectId,
    });

    await dbCreatePackDeliverable({
      workspaceId: params.workspaceId,
      clientId: osClientId,
      projectId: osProjectId,
      title: config.reportDeliverableTitle ?? `Informe ${meta.name}`,
      type: "json",
      visibility: "client_visible",
      metadata: { pack_report: report, pack_run_id: run.id, pack_id: meta.id },
    });
    steps = markStep(steps, "report", "done");

    const autoPublishThreshold = config.autoPublishQaThreshold ?? 85;
    const needsReview = skuResults.some(
      (r) =>
        r.qa_score < autoPublishThreshold ||
        (r.qa_visual_score !== undefined && r.qa_visual_score < 70) ||
        r.qa_legal_passed === false ||
        r.qa_gate_status === "blocked", // O18 — legal/hard block from the QA gate
    );
    const finalStatus = needsReview ? "needs_review" : "completed";
    steps = markStep(steps, "complete", needsReview ? "skipped" : "done");

    // Auto-approve deliverables when all SKUs pass QA threshold — no human needed
    let autoApprovedCount = 0;
    if (finalStatus === "completed") {
      autoApprovedCount = await dbAutoApprovePackDeliverables({
        workspaceId: params.workspaceId,
        projectId: osProjectId,
      }).catch(() => 0);

      // Welcome email via SES (best-effort — never blocks pack completion)
      if (intake.contact_email && process.env.SES_FROM_EMAIL) {
        const { sendEmail } = await import("../../../../../backend/email/emailService");
        await sendEmail("welcome", {
          email: intake.contact_email,
          name: intake.contact_name ?? intake.business_name,
          appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com",
        }).catch(() => null);
      }
    }

    run = (await updatePackRun(run.id, {
      steps,
      status: finalStatus,
      report,
      completed_at: new Date().toISOString(),
    }))!;

    return (await getPackRun(run.id))!;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido en el pack";
    await updatePackRun(run.id, {
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    });
    throw err;
  }
}
