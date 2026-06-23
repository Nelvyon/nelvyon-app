/**
 * Curated seed library — max 500 downloads (Envato + Aceternity).
 * Quality-first selection with sector/kind coverage for client variety.
 */
import baseCatalog from "./data/base-seed-catalog.json";
import expansionPool from "./data/curated-expansion-pool.json";
import { SECTOR_GROUPS } from "./seed-download-catalog";
import type { SeedCatalogEntry, SeedProvider } from "./types";

export const CURATED_SEED_LIMIT = 500;

export type CuratedSeedMeta = SeedCatalogEntry & {
  seed_id: string;
  quality_score: number;
  primary_kind: string;
  sector_groups: string[];
};

export type CuratedSeedStats = {
  total: number;
  limit: number;
  by_provider: Record<string, number>;
  by_kind: Record<string, number>;
  by_sector_group: Record<string, number>;
  variety_buckets: number;
};

type PoolItem = {
  item_name: string;
  provider: SeedProvider;
  kinds: string[];
  services: string[];
  pack_ids: string;
  sector_groups: string[];
  quality_score: number;
  notes: string;
};

const EXPANSION_POOL = expansionPool as PoolItem[];
const BASE_CATALOG = baseCatalog as SeedCatalogEntry[];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function primaryKind(kinds: string[]): string {
  const order = [
    "landing",
    "funnel",
    "email_sequence",
    "email",
    "ad_creative",
    "seo_page",
    "content_page",
    "automation_recipe",
    "report_section",
  ];
  for (const k of order) {
    if (kinds.includes(k)) return k;
  }
  return kinds[0] ?? "landing";
}

function toCurated(entry: SeedCatalogEntry, quality_score: number, sector_groups: string[]): CuratedSeedMeta {
  const pk = primaryKind(entry.kinds);
  return {
    ...entry,
    seed_id: `${entry.provider === "Aceternity" ? "ace" : "env"}-${slugify(entry.item_name)}`,
    quality_score,
    primary_kind: pk,
    sector_groups,
  };
}

function inferGroups(entry: SeedCatalogEntry): string[] {
  if (entry.match.groups?.length) return entry.match.groups;
  if (entry.match.sectors?.length) {
    return [...new Set(entry.match.sectors.map((s) => SECTOR_GROUPS[s] ?? "other"))];
  }
  return ["other"];
}

function buildCuratedSeeds(): CuratedSeedMeta[] {
  const seen = new Set<string>();
  const out: CuratedSeedMeta[] = [];

  const push = (meta: CuratedSeedMeta) => {
    const key = `${meta.provider}|${meta.item_name}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(meta);
  };

  for (const e of BASE_CATALOG) {
    push(toCurated(e, e.provider === "Aceternity" ? 95 : 88, inferGroups(e)));
  }

  const sortedExpansion = [...EXPANSION_POOL].sort((a, b) => b.quality_score - a.quality_score);
  for (const p of sortedExpansion) {
    if (out.length >= CURATED_SEED_LIMIT) break;
    push(
      toCurated(
        {
          provider: p.provider,
          item_name: p.item_name,
          kinds: p.kinds,
          services: p.services,
          match: { groups: p.sector_groups },
          pack_ids: p.pack_ids,
          lang: "en",
          notes: p.notes,
        },
        p.quality_score,
        p.sector_groups,
      ),
    );
  }

  return out.slice(0, CURATED_SEED_LIMIT);
}

export const CURATED_SEEDS: CuratedSeedMeta[] = buildCuratedSeeds();

export function computeCuratedStats(seeds: CuratedSeedMeta[] = CURATED_SEEDS): CuratedSeedStats {
  const by_provider: Record<string, number> = {};
  const by_kind: Record<string, number> = {};
  const by_sector_group: Record<string, number> = {};
  const buckets = new Set<string>();

  for (const s of seeds) {
    by_provider[s.provider] = (by_provider[s.provider] ?? 0) + 1;
    by_kind[s.primary_kind] = (by_kind[s.primary_kind] ?? 0) + 1;
    for (const g of s.sector_groups) {
      by_sector_group[g] = (by_sector_group[g] ?? 0) + 1;
    }
    for (const g of s.sector_groups) {
      buckets.add(`${g}|${s.primary_kind}`);
    }
  }

  return {
    total: seeds.length,
    limit: CURATED_SEED_LIMIT,
    by_provider,
    by_kind,
    by_sector_group,
    variety_buckets: buckets.size,
  };
}

export function listCuratedCandidates(
  sectorId: string,
  service: string,
  kind: string,
): CuratedSeedMeta[] {
  const group = SECTOR_GROUPS[sectorId] ?? "other";
  return CURATED_SEEDS.filter((s) => {
    const nk = kind === "web_page" ? "landing" : kind;
    if (!s.kinds.includes(kind) && !s.kinds.includes(nk) && s.primary_kind !== nk) return false;
    if (!s.services.includes(service) && !s.services.includes("Landing")) return false;
    return s.sector_groups.includes(group) || s.sector_groups.includes("other");
  });
}

export function pickCuratedSeed(input: {
  sectorId: string;
  service: string;
  kind: string;
  varietyKey?: string;
}): CuratedSeedMeta | null {
  const candidates = listCuratedCandidates(input.sectorId, input.service, input.kind);
  if (!candidates.length) {
    const fallback = CURATED_SEEDS.filter((s) => s.kinds.includes(input.kind) || s.primary_kind === input.kind);
    if (!fallback.length) return null;
    const sorted = [...fallback].sort((a, b) => b.quality_score - a.quality_score);
    const idx = hash32(input.varietyKey ?? input.sectorId) % sorted.length;
    return sorted[idx] ?? null;
  }
  const sorted = [...candidates].sort((a, b) => b.quality_score - a.quality_score);
  const idx =
    hash32(`${input.varietyKey ?? "default"}|${input.sectorId}|${input.service}|${input.kind}`) %
    sorted.length;
  return sorted[idx] ?? null;
}

export function curatedSeedToCatalogEntry(meta: CuratedSeedMeta): SeedCatalogEntry {
  const { seed_id: _id, quality_score: _q, primary_kind: _pk, sector_groups, ...entry } = meta;
  return {
    ...entry,
    match: { groups: sector_groups },
  };
}

export const CURATED_SEED_STATS = computeCuratedStats();
