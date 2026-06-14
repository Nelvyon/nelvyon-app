import { simulateAutonomousJob } from "../../../../../backend/autonomous/simulator";
import type { AutonomousSku } from "../../../../../backend/autonomous/types";

import type { PackMeta } from "@/lib/packs/packRegistry";
import {
  dbCreateOsClient,
  dbCreateOsProject,
  dbCreatePackDeliverable,
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
  }) => PackReport;
  projectDescription: (intake: T) => string;
};

async function runSkuPipeline<T extends GrowthPackIntakeBase & { sector: string }>(params: {
  sku: AutonomousSku;
  packId: string;
  intake: T;
  buildBrief: (intake: T) => Record<string, unknown>;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
  projectSlug: string;
}): Promise<{ result: SkuRunResult; deliverableIds: string[] }> {
  const brief = params.buildBrief(params.intake);
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

  if (passed && simulation.os_publish) {
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
        },
      });
      deliverableIds.push(id);
    }
  }

  return {
    result: {
      sku: params.sku,
      qa_score: qaScore,
      passed,
      escalated: simulation.escalated,
      deliverable_ids: deliverableIds,
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
        intake,
        buildBrief: config.buildBrief,
        osClientId,
        osProjectId,
        workspaceId: params.workspaceId,
        projectSlug,
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

    const report = config.buildReport({
      intake,
      skuResults,
      saasClientId: Number(saasClient.id),
      saasCampaignId: Number(campaign.id),
      extraCampaignCount,
      extraDeliverableCount,
    });

    await dbCreatePackDeliverable({
      workspaceId: params.workspaceId,
      clientId: osClientId,
      projectId: osProjectId,
      title: `Informe ${meta.name}`,
      type: "json",
      visibility: "client_visible",
      metadata: { pack_report: report, pack_run_id: run.id },
    });
    steps = markStep(steps, "report", "done");

    const needsReview = skuResults.some((r) => r.escalated || !r.passed);
    const finalStatus = needsReview ? "needs_review" : "completed";
    steps = markStep(steps, "complete", needsReview ? "skipped" : "done");

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
