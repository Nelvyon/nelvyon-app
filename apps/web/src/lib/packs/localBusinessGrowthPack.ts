import { simulateAutonomousJob } from "../../../../../backend/autonomous/simulator";
import type { AutonomousSku } from "../../../../../backend/autonomous/types";

import {
  dbCreateClient,
  dbCreateCampaign,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";
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
  LocalGrowthPackIntake,
  PackReport,
  PackRunRecord,
  SkuRunResult,
} from "@/lib/packs/types";
import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";

const SKU_SEQUENCE: AutonomousSku[] = ["NELVYON-LANDING", "NELVYON-SEO", "NELVYON-CHATBOT"];

const SKU_STEP_KEYS: Record<AutonomousSku, string> = {
  "NELVYON-LANDING": "sku_landing",
  "NELVYON-SEO": "sku_seo",
  "NELVYON-CHATBOT": "sku_chatbot",
};

export function buildBriefFromIntake(intake: LocalGrowthPackIntake): Record<string, unknown> {
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
      regulated_sector: intake.sector === "dental",
      requires_legal_review: intake.sector === "dental",
    },
  };
}

function slugify(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

async function runSkuPipeline(params: {
  sku: AutonomousSku;
  intake: LocalGrowthPackIntake;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
  projectSlug: string;
}): Promise<{ result: SkuRunResult; deliverableIds: string[] }> {
  const brief = buildBriefFromIntake(params.intake);
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
          pack_id: LOCAL_GROWTH_PACK_ID,
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

function buildPackReport(params: {
  intake: LocalGrowthPackIntake;
  skuResults: SkuRunResult[];
  saasClientId: number | null;
  saasCampaignId: number | null;
  reportDeliverableId: string;
}): PackReport {
  const passed = params.skuResults.filter((r) => r.passed);
  const avgQa =
    params.skuResults.length > 0
      ? Math.round(
          params.skuResults.reduce((a, r) => a + r.qa_score, 0) / params.skuResults.length,
        )
      : 0;
  const deliverables = params.skuResults.reduce((a, r) => a + r.deliverable_ids.length, 0) + 1;

  return {
    pack_name: "Nelvyon Local Growth Pack",
    pack_id: LOCAL_GROWTH_PACK_ID,
    business_name: params.intake.business_name,
    sector: params.intake.sector,
    completed_at: new Date().toISOString(),
    summary: `${passed.length}/${params.skuResults.length} servicios autónomos entregados con QA ≥ umbral. Landing, SEO y chatbot listos para revisión en portal.`,
    kpis: {
      deliverables_published: deliverables,
      avg_qa_score: avgQa,
      skus_passed: passed.length,
      skus_total: params.skuResults.length,
      saas_client_id: params.saasClientId,
      saas_campaign_id: params.saasCampaignId,
    },
    sku_results: params.skuResults,
    next_steps: [
      "Revisar entregables en el portal del cliente",
      "Conectar dominio y pixel de conversión",
      "Activar campaña de bienvenida email en el panel SaaS",
      "Programar revisión SEO a 30 días",
    ],
    portal_path: "/portal",
  };
}

export async function runLocalBusinessGrowthPack(params: {
  workspaceId: number;
  userId: string;
  intake: LocalGrowthPackIntake;
}): Promise<PackRunRecord> {
  if (!platformDbFallbackEnabled()) {
    throw new Error("DATABASE_URL requerida para ejecutar el Growth Pack");
  }

  const intake = params.intake;
  let run = await createPackRun({
    workspaceId: params.workspaceId,
    userId: params.userId,
    packId: LOCAL_GROWTH_PACK_ID,
    intake,
    stepDefinitions: [
      { key: "intake", label: "Brief recibido" },
      { key: "saas_client", label: "Cliente en panel SaaS (Revenue)" },
      { key: "saas_campaign", label: "Campaña de bienvenida creada" },
      { key: "os_client", label: "Cliente OS provisionado" },
      { key: "os_project", label: "Proyecto OS creado" },
      { key: "sku_landing", label: "Landing autónoma (NELVYON-LANDING)" },
      { key: "sku_seo", label: "Auditoría SEO (NELVYON-SEO)" },
      { key: "sku_chatbot", label: "Chatbot de citas (NELVYON-CHATBOT)" },
      { key: "report", label: "Informe Growth Pack en portal" },
      { key: "complete", label: "Pack completado" },
    ],
  });

  let steps = run.steps;

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

    const campaign = await dbCreateCampaign(params.workspaceId, params.userId, {
      client_id: saasClient.id,
      project_id: saasClient.id,
      platform: "email",
      campaign_type: "welcome",
      name: `Bienvenida — ${intake.business_name}`,
      content: `Secuencia de bienvenida para ${intake.business_name}. CTA: ${intake.primary_cta}`,
      target_audience: `${intake.sector} — ${intake.city}`,
      status: "ready",
    });
    steps = markStep(steps, "saas_campaign", "done", `Campaña #${campaign.id}`);
    run = (await updatePackRun(run.id, { steps, saas_campaign_id: Number(campaign.id) }))!;

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

    const projectSlug = `LGP-${slugify(intake.business_name)}`;
    const osProjectId = await dbCreateOsProject({
      workspaceId: params.workspaceId,
      clientId: osClientId,
      name: `Local Growth Pack — ${intake.business_name}`,
      description: `Pack autónomo: landing + SEO + chatbot para ${intake.sector} en ${intake.city}`,
      packRunId: run.id,
    });
    steps = markStep(steps, "os_project", "done", osProjectId);
    run = (await updatePackRun(run.id, { steps, os_project_id: osProjectId }))!;

    const skuResults: SkuRunResult[] = [];
    for (const sku of SKU_SEQUENCE) {
      const stepKey = SKU_STEP_KEYS[sku];
      steps = markStep(steps, stepKey, "running");
      await updatePackRun(run.id, { steps });

      const { result } = await runSkuPipeline({
        sku,
        intake,
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

    const report = buildPackReport({
      intake,
      skuResults,
      saasClientId: Number(saasClient.id),
      saasCampaignId: Number(campaign.id),
      reportDeliverableId: "",
    });

    const reportDeliverableId = await dbCreatePackDeliverable({
      workspaceId: params.workspaceId,
      clientId: osClientId,
      projectId: osProjectId,
      title: "Informe Nelvyon Local Growth Pack",
      type: "json",
      visibility: "client_visible",
      metadata: { pack_report: report, pack_run_id: run.id },
    });
    steps = markStep(steps, "report", "done", reportDeliverableId);

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

export function validateLocalGrowthIntake(body: unknown): LocalGrowthPackIntake | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const sectors = new Set([
    "restaurant",
    "dental",
    "fitness",
    "beauty",
    "real_estate",
    "coaching",
  ]);
  const sector = String(o.sector ?? "").trim();
  if (!sectors.has(sector)) return null;
  const business_name = String(o.business_name ?? "").trim();
  const city = String(o.city ?? "").trim();
  const value_proposition = String(o.value_proposition ?? "").trim();
  const primary_cta = String(o.primary_cta ?? "").trim();
  if (!business_name || !city || !value_proposition || !primary_cta) return null;
  return {
    business_name,
    sector: sector as LocalGrowthPackIntake["sector"],
    city,
    country: o.country ? String(o.country) : "ES",
    contact_email: o.contact_email ? String(o.contact_email) : undefined,
    contact_name: o.contact_name ? String(o.contact_name) : undefined,
    website_url: o.website_url ? String(o.website_url) : undefined,
    value_proposition,
    primary_cta,
    tier: o.tier === "premium" ? "premium" : "professional",
  };
}
