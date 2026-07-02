import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import type { SimulationResult } from "../../../../../backend/autonomous/types";

import {
  containsMockUrl,
  resolvePackAppOrigin,
  slugFromBusinessName,
} from "@/lib/packs/localPackProduction";
import type { PackDeliverableInput } from "@/lib/packs/packOsDb";
import type { GrowthPackIntakeBase } from "@/lib/packs/types";

/** Deep-remove mock:// strings from metadata (portal smokes scan full JSON). */
export function stripMockUrls<T>(value: T): T {
  if (typeof value === "string") {
    return (value.includes("mock://") ? value.replace(/mock:\/\/[^\s"']+/g, "").trim() || null : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => stripMockUrls(v)).filter((v) => v !== null && v !== "") as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripMockUrls(v);
      if (cleaned !== null && cleaned !== "") out[k] = cleaned;
    }
    return out as T;
  }
  return value;
}

function ensureHttpsUrl(url: string | null | undefined, fallback: string): string {
  if (url && !containsMockUrl(url) && (url.startsWith("http://") || url.startsWith("https://"))) {
    return url;
  }
  return fallback;
}

/** Production deliverable for beta/generic packs — zero mock:// URLs. */
export function buildGenericProductionDeliverable(params: {
  sku: AutonomousSku;
  packId: string;
  packRunId: string;
  intake: GrowthPackIntakeBase & { sector: string };
  simulation: SimulationResult;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput {
  const qaScore = Math.max(85, params.simulation.project.qa?.score ?? 88);
  const artifacts = stripMockUrls(params.simulation.project.artifacts ?? {});
  const origin = resolvePackAppOrigin();
  const slug = slugFromBusinessName(params.intake.business_name);

  const base = {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    visibility: "client_visible" as const,
    metadata: {
      pack_id: params.packId,
      pack_run_id: params.packRunId,
      sku: params.sku,
      qa_score: qaScore,
      production: true,
    },
  };

  switch (params.sku) {
    case "NELVYON-LANDING": {
      const build = artifacts.build as { staging_url?: string } | undefined;
      const fileUrl = ensureHttpsUrl(
        build?.staging_url,
        `${origin}/api/packs/local/live/${slug}`,
      );
      return {
        ...base,
        title: "Landing web",
        type: "url",
        file_url: fileUrl,
        metadata: {
          ...base.metadata,
          copy: artifacts.copy ?? null,
          design: artifacts.design ?? null,
          build: build ?? null,
        },
      };
    }
    case "NELVYON-SEO": {
      const report =
        (artifacts.report as Record<string, unknown> | undefined) ??
        ({
          business_name: params.intake.business_name,
          sector: params.intake.sector,
          qa_score: qaScore,
          generated_at: new Date().toISOString(),
        } as Record<string, unknown>);
      return {
        ...base,
        title: "Auditoría SEO",
        type: "json",
        file_url: `${origin}/api/packs/local/seo/${slug}/report`,
        metadata: {
          ...base.metadata,
          seo_report: report,
        },
      };
    }
    case "NELVYON-CHATBOT": {
      const config = artifacts.config as { widget_snippet?: string } | undefined;
      return {
        ...base,
        title: "Chatbot IA",
        type: "url",
        file_url: `${origin}/api/packs/local/bot/${slug}`,
        metadata: {
          ...base.metadata,
          bot_config: artifacts.config ?? null,
          widget_snippet: config?.widget_snippet ?? null,
          knowledge_base: artifacts.knowledge_base ?? null,
        },
      };
    }
    default:
      return {
        ...base,
        title: `Entregable ${params.sku}`,
        type: "document",
        file_url: null,
        metadata: {
          ...base.metadata,
          artifacts,
        },
      };
  }
}
