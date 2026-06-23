import { NELVYON_BLOCK_CATALOG } from "./blocks/catalog";
import {
  AD_CREATIVE_PRESETS,
  REPORT_SECTION_PRESETS,
  SEO_PAGE_PRESETS,
} from "./compositions/ads-seo-report-presets";
import { EMAIL_SEQUENCE_PRESETS, EMAIL_SINGLE_PRESETS } from "./compositions/email-presets";
import { AUTOMATION_RECIPE_PRESETS, FUNNEL_PRESETS } from "./compositions/funnel-presets";
import { LANDING_PRESETS } from "./compositions/landing-presets";
import { ACETERNITY_SEED_MANIFEST } from "./ingest/aceternity-manifest";
import { SAAS_SERVICES } from "./service-layers";
import type {
  NelvyonTemplateEntry,
  TemplateKind,
  TemplateLibraryQuery,
  TemplateResolveInput,
  TemplateResolveResult,
  TemplateService,
} from "./types";
import { SECTOR_VERTICAL_MAP } from "./taxonomy";
import { assertClientDeliverable } from "./license";

/** Block catalog as registry entries (for search/discovery). */
const BLOCK_ENTRIES: NelvyonTemplateEntry[] = NELVYON_BLOCK_CATALOG.map((b, i) => ({
  id: `block-${b.block_type}-${b.variant}`,
  name: `${b.block_type} · ${b.variant}`,
  kind: "block" as const,
  service: "landing" as TemplateService,
  sector: "all" as const,
  verticals: ["local", "ecommerce", "saas_b2b", "agency", "creator"],
  languages: ["es", "en"],
  tags: [b.block_type, b.variant],
  source: "nelvyon_native" as const,
  nelvyon_owned: true,
  status: "active" as const,
  scores: { quality: 85, conversion: 80, speed: 88, premium: 84 },
  block_catalog_ref: `${b.block_type}:${b.variant}`,
}));

/** Seed-only registry entries (never client-deliverable). */
const SEED_ENTRIES: NelvyonTemplateEntry[] = ACETERNITY_SEED_MANIFEST.map((s) => ({
  id: s.seed_id,
  name: `Seed Aceternity · ${s.bundle_folder.split("/").pop()}`,
  kind: "landing" as const,
  service: "landing" as TemplateService,
  sector: "saas_b2b" as const,
  verticals: ["saas_b2b", "agency"] as const,
  languages: ["en"] as const,
  tags: ["seed", "aceternity", "internal-only"],
  source: "aceternity_seed" as const,
  nelvyon_owned: false,
  status: "seed_only" as const,
  scores: { quality: 80, conversion: 75, speed: 70, premium: 85 },
  license_id: s.license_id,
  description: "Solo referencia interna para conversión a bloques nativos.",
}));

const ALL_TEMPLATES: NelvyonTemplateEntry[] = [
  ...BLOCK_ENTRIES,
  ...LANDING_PRESETS,
  ...EMAIL_SEQUENCE_PRESETS,
  ...EMAIL_SINGLE_PRESETS,
  ...FUNNEL_PRESETS,
  ...AUTOMATION_RECIPE_PRESETS,
  ...AD_CREATIVE_PRESETS,
  ...SEO_PAGE_PRESETS,
  ...REPORT_SECTION_PRESETS,
  ...SEED_ENTRIES,
];

export function getTemplateLibraryStats() {
  const clientFacing = ALL_TEMPLATES.filter((t) => t.nelvyon_owned && t.status === "active");
  const byKind = (kind: TemplateKind) => clientFacing.filter((t) => t.kind === kind).length;
  return {
    total: ALL_TEMPLATES.length,
    client_facing: clientFacing.length,
    seeds_internal: ALL_TEMPLATES.filter((t) => t.status === "seed_only").length,
    blocks: byKind("block"),
    landings: byKind("landing"),
    funnels: byKind("funnel"),
    email_sequences: byKind("email_sequence"),
    emails: byKind("email"),
    ad_creatives: byKind("ad_creative"),
    seo_pages: byKind("seo_page"),
    automation_recipes: byKind("automation_recipe"),
    report_sections: byKind("report_section"),
  };
}

export function listTemplates(query: TemplateLibraryQuery = {}): NelvyonTemplateEntry[] {
  let results = ALL_TEMPLATES.filter((t) => {
    if (query.service && t.service !== query.service) return false;
    if (query.kind && t.kind !== query.kind) return false;
    if (query.sector && t.sector !== query.sector && t.sector !== "all") return false;
    if (query.vertical && !t.verticals.includes(query.vertical)) return false;
    if (query.language && !t.languages.includes(query.language)) return false;
    if (query.pack_id && !t.pack_ids?.includes(query.pack_id)) return false;
    if (query.source && t.source !== query.source) return false;
    if (query.status && t.status !== query.status) return false;
    if (query.min_quality && t.scores.quality < query.min_quality) return false;
    if (query.tag && !t.tags.includes(query.tag)) return false;
    return true;
  });

  results = results.sort((a, b) => b.scores.quality - a.scores.quality);

  if (query.limit && query.limit > 0) {
    results = results.slice(0, query.limit);
  }

  return results;
}

export function getTemplateById(id: string): NelvyonTemplateEntry | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

/** Resolve best client-facing template for pack/service/sector. */
export function resolveTemplate(input: TemplateResolveInput): TemplateResolveResult | null {
  const vertical = input.vertical ?? SECTOR_VERTICAL_MAP[input.sector];
  const candidates = listTemplates({
    service: input.service,
    kind: input.kind,
    sector: input.sector,
    vertical,
    language: input.language,
    pack_id: input.pack_id,
    status: "active",
  }).filter((t) => t.nelvyon_owned);

  if (!candidates.length) {
    const fallback = listTemplates({
      service: input.service,
      kind: input.kind,
      status: "active",
    }).filter((t) => t.nelvyon_owned && (t.sector === "all" || t.sector === input.sector));
    if (!fallback.length) return null;
    return { template: fallback[0]!, alternates: fallback.slice(1, 4) };
  }

  return { template: candidates[0]!, alternates: candidates.slice(1, 4) };
}

/** For pack kickoff — bundle of native client templates (SaaS layer only). */
export function resolvePackTemplateBundle(input: {
  pack_id: string;
  sector: TemplateResolveInput["sector"];
  language?: TemplateResolveInput["language"];
}) {
  const packServices = SAAS_SERVICES.filter((s) => s.pack_id === input.pack_id);
  const kinds = new Set<TemplateKind>();
  for (const svc of packServices) {
    for (const k of svc.kinds) {
      if (
        k === "landing" ||
        k === "funnel" ||
        k === "email_sequence" ||
        k === "email" ||
        k === "ad_creative" ||
        k === "seo_page" ||
        k === "content_page" ||
        k === "automation_recipe" ||
        k === "report_section"
      ) {
        kinds.add(k);
      }
    }
  }
  if (!kinds.size) {
    kinds.add("landing");
    kinds.add("email_sequence");
    kinds.add("ad_creative");
    kinds.add("seo_page");
    kinds.add("funnel");
    kinds.add("automation_recipe");
  }

  const bundle: Record<string, NelvyonTemplateEntry | null> = {};
  for (const kind of kinds) {
    const service: TemplateService =
      kind === "landing"
        ? "landing"
        : kind === "email_sequence" || kind === "email"
          ? "email"
          : kind === "ad_creative"
            ? "ads"
            : kind === "seo_page" || kind === "content_page"
              ? "seo"
              : kind === "funnel"
                ? "funnel"
                : "automation";
    bundle[kind] =
      resolveTemplate({
        service,
        kind,
        sector: input.sector,
        pack_id: input.pack_id,
        language: input.language,
      })?.template ?? null;
  }
  return bundle;
}

export function getClientDeliverableTemplate(id: string): NelvyonTemplateEntry {
  const t = getTemplateById(id);
  if (!t) throw new Error(`Template not found: ${id}`);
  assertClientDeliverable(t.source, t.nelvyon_owned);
  if (t.status === "seed_only") {
    throw new Error(`Template ${id} is seed-only and cannot be delivered.`);
  }
  return t;
}

export { ALL_TEMPLATES };
