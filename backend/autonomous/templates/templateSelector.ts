/** Template selector — best template per sector/service slice */

import { discoverSlices, rankTemplatesForSlice } from "./templateRanking";
import type {
  RankedSlice,
  TemplateOutcome,
  TemplateRegistryEntry,
  TemplateSelection,
  TemplateSlice,
} from "./types";

export function selectBestTemplate(
  slice: TemplateSlice,
  outcomes: TemplateOutcome[],
  registryEntries: TemplateRegistryEntry[],
): TemplateSelection | null {
  const ranked = rankTemplatesForSlice(slice, outcomes, registryEntries);
  if (ranked.length === 0) return null;

  const top = ranked[0];
  return {
    slice,
    selected_template_id: top.template_id,
    final_template_score: top.final_template_score,
    cold_start: top.cold_start,
    alternatives: ranked.slice(1, 4).map((r) => ({
      template_id: r.template_id,
      final_template_score: r.final_template_score,
    })),
  };
}

export function selectBySectorAndService(
  sector: string,
  service: string,
  category: TemplateSlice["category"],
  outcomes: TemplateOutcome[],
  registryEntries: TemplateRegistryEntry[],
  extras?: Partial<TemplateSlice>,
): TemplateSelection | null {
  return selectBestTemplate(
    {
      category,
      sector,
      service,
      objective: extras?.objective,
      channel: extras?.channel,
      language: extras?.language ?? "es",
      level: extras?.level ?? "professional",
    },
    outcomes,
    registryEntries,
  );
}

export function selectByCategory(
  category: TemplateSlice["category"],
  outcomes: TemplateOutcome[],
  registryEntries: TemplateRegistryEntry[],
): TemplateSelection[] {
  const sectors = new Set<string>();
  for (const o of outcomes) {
    if (o.category === category) sectors.add(o.sector);
  }
  for (const t of registryEntries) {
    if (t.category === category) t.sectors.forEach((s) => sectors.add(s));
  }

  const services = new Set<string>();
  for (const t of registryEntries) {
    if (t.category === category) t.services.forEach((s) => services.add(s));
  }

  const selections: TemplateSelection[] = [];
  for (const sector of sectors) {
    for (const service of services) {
      const sel = selectBySectorAndService(sector, service, category, outcomes, registryEntries);
      if (sel) selections.push(sel);
    }
  }
  return selections;
}

export function buildRankedSlices(
  outcomes: TemplateOutcome[],
  registryEntries: TemplateRegistryEntry[],
): RankedSlice[] {
  const slices = discoverSlices(outcomes, registryEntries);
  const computed_at = new Date().toISOString();

  return slices.map((slice) => ({
    slice,
    ranked: rankTemplatesForSlice(slice, outcomes, registryEntries),
    computed_at,
  }));
}
