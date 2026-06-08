/** Phase L — template selection for autonomous pipelines (rankings.json + registry) */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadTemplateRegistry } from "./loadRegistry";
import { rankTemplatesForSlice } from "./templateRanking";
import { templateOutcomeRepository } from "./templateOutcomeRepository";
import type { TemplateCategory, TemplateScoreBreakdown, TemplateSlice } from "./types";

const _ROOT = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_RANKINGS_PATH = join(_ROOT, "..", "output", "learning", "rankings.json");

export const MIN_AUTO_TEMPLATE_SCORE = 65;

const DEFAULT_TEMPLATES: Record<string, string> = {
  restaurant: "landing-cro-v3",
  dental: "landing-hero-split",
  solar: "landing-form-long",
  saas_b2b: "landing-saas-trial",
  ecommerce: "landing-catalog-bridge",
  general: "landing-cro-v3",
};

export type TemplatePickSource = "rankings" | "registry" | "default";

export interface PipelineTemplatePick {
  template_id: string;
  final_template_score: number;
  source: TemplatePickSource;
  alternatives: Array<{ template_id: string; final_template_score: number }>;
  skipped_low_score: string[];
}

function loadRankingsFile(path: string): Array<{
  slice: TemplateSlice;
  ranked: TemplateScoreBreakdown[];
}> | null {
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf-8")) as {
      slices?: Array<{ slice: TemplateSlice; ranked: TemplateScoreBreakdown[] }>;
    };
    return data.slices ?? null;
  } catch {
    return null;
  }
}

function sliceKey(s: TemplateSlice): string {
  return `${s.category}|${s.sector}|${s.service}|${s.objective ?? "*"}|${s.channel ?? "*"}|${s.language ?? "*"}|${s.level ?? "*"}`;
}

function matchesSliceLoose(a: TemplateSlice, b: TemplateSlice): boolean {
  return a.category === b.category && a.sector === b.sector && a.service === b.service;
}

function filterRanked(
  ranked: TemplateScoreBreakdown[],
  usedTemplateIds: Set<string>,
): { eligible: TemplateScoreBreakdown[]; skipped: string[] } {
  const skipped: string[] = [];
  const eligible: TemplateScoreBreakdown[] = [];

  for (const r of ranked) {
    if (usedTemplateIds.has(r.template_id)) continue;
    if (r.final_template_score < MIN_AUTO_TEMPLATE_SCORE) {
      skipped.push(r.template_id);
      continue;
    }
    eligible.push(r);
  }

  if (eligible.length === 0 && ranked.length > 0) {
    const fallback = ranked.find((r) => !usedTemplateIds.has(r.template_id));
    if (fallback) eligible.push(fallback);
  }

  return { eligible, skipped };
}

export async function pickPipelineTemplate(options: {
  sector: string;
  service: string;
  category: TemplateCategory;
  objective?: string;
  channel?: string;
  language?: string;
  level?: string;
  usedTemplateIds?: string[];
  rankingsPath?: string;
}): Promise<PipelineTemplatePick> {
  const used = new Set(options.usedTemplateIds ?? []);
  const slice: TemplateSlice = {
    category: options.category,
    sector: options.sector,
    service: options.service,
    objective: options.objective,
    channel: options.channel ?? "web",
    language: options.language ?? "es",
    level: options.level ?? "professional",
  };

  const rankingsPath = options.rankingsPath ?? process.env.AUTONOMOUS_LEARNING_RANKINGS_PATH ?? DEFAULT_RANKINGS_PATH;
  const rankings = loadRankingsFile(rankingsPath);
  if (rankings) {
    const match =
      rankings.find((s) => sliceKey(s.slice) === sliceKey(slice)) ??
      rankings.find((s) => matchesSliceLoose(s.slice, slice));

    if (match && match.ranked.length > 0) {
      const { eligible, skipped } = filterRanked(match.ranked, used);
      const top = eligible[0] ?? match.ranked.find((r) => !used.has(r.template_id));
      if (top) {
        return {
          template_id: top.template_id,
          final_template_score: top.final_template_score,
          source: "rankings",
          alternatives: eligible.slice(1, 4).map((r) => ({
            template_id: r.template_id,
            final_template_score: r.final_template_score,
          })),
          skipped_low_score: skipped,
        };
      }
    }
  }

  const registry = loadTemplateRegistry();
  const outcomes = await templateOutcomeRepository.listOutcomes({
    category: slice.category,
    sector: slice.sector,
    service: slice.service,
  });
  const ranked = rankTemplatesForSlice(slice, outcomes, registry.templates);
  if (ranked.length > 0) {
    const { eligible, skipped } = filterRanked(ranked, used);
    const top = eligible[0] ?? ranked.find((r) => !used.has(r.template_id));
    if (top) {
      return {
        template_id: top.template_id,
        final_template_score: top.final_template_score,
        source: "registry",
        alternatives: eligible.slice(1, 4).map((r) => ({
          template_id: r.template_id,
          final_template_score: r.final_template_score,
        })),
        skipped_low_score: skipped,
      };
    }
  }

  const defaultId = DEFAULT_TEMPLATES[options.sector] ?? DEFAULT_TEMPLATES.general;
  return {
    template_id: defaultId,
    final_template_score: 50,
    source: "default",
    alternatives: [],
    skipped_low_score: [],
  };
}

export function skuToTemplateContext(sku: string): { category: TemplateCategory; service: string } {
  switch (sku) {
    case "NELVYON-CHATBOT":
      return { category: "chatbot", service: "chatbot" };
    case "NELVYON-SEO":
      return { category: "landing", service: "landing" };
    case "NELVYON-LANDING":
    default:
      return { category: "landing", service: "landing" };
  }
}
