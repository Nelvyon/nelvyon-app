/**
 * Selects the best on-disk seed template for a pack / sector / service.
 * Reads metadata from templates/seeds/ — never downloads at runtime.
 */
import { pickCuratedSeed } from "./curated-seed-library";
import { getSeedBySlug, listSeedMetadata, type SeedMetadataRecord } from "./ingest/seed-store";
import { SECTOR_GROUPS } from "./seed-download-catalog";
import { resolveSectorGroupShell } from "./seed-shells";

export type SeedSelectionInput = {
  pack_id: string;
  sector: string;
  service?: string;
  kind?: string;
  /** Stable key per client — varies template within same sector */
  varietyKey?: string;
};

export type SeedSelectionResult = {
  seed: SeedMetadataRecord | null;
  catalog_item_name: string;
  provider: "aceternity" | "envato";
  slug: string;
  sector_group: string;
  shell_id: string;
  asset_status: "full_assets" | "zip_only" | "shell_only" | "metadata_only";
  selection_reason: string;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function providerDir(provider: string): "aceternity" | "envato" {
  return provider === "Aceternity" ? "aceternity" : "envato";
}

function detectAssetStatus(meta: SeedMetadataRecord | null): SeedSelectionResult["asset_status"] {
  if (!meta || meta.status !== "on_disk") return "metadata_only";
  const storage = meta.storage ?? {};
  if (storage.assets_dir) return "full_assets";
  if (storage.source_zip) return "zip_only";
  return "shell_only";
}

function resolveSeedRecord(itemName: string, provider: string): SeedMetadataRecord | null {
  const dir = providerDir(provider);
  const slug = slugify(itemName);
  return getSeedBySlug(dir, slug);
}

/** Pick best seed for pack kickoff / landing deliverable. */
export function selectSeedForPack(input: SeedSelectionInput): SeedSelectionResult {
  const service = input.service ?? "Landing";
  const kind = input.kind ?? "landing";
  const sectorGroup = SECTOR_GROUPS[input.sector] ?? "other";

  const curated = pickCuratedSeed({
    sectorId: input.sector,
    service,
    kind,
    varietyKey: input.varietyKey ?? `${input.pack_id}:${input.sector}`,
  });

  if (!curated) {
    const shell = resolveSectorGroupShell(sectorGroup, kind);
    return {
      seed: null,
      catalog_item_name: shell.label,
      provider: "envato",
      slug: shell.id,
      sector_group: sectorGroup,
      shell_id: shell.id,
      asset_status: "shell_only",
      selection_reason: `fallback shell — no curated match for ${input.sector}/${kind}`,
    };
  }

  const seed = resolveSeedRecord(curated.item_name, curated.provider);
  const provider = providerDir(curated.provider);
  const slug = slugify(curated.item_name);
  const shell = resolveSectorGroupShell(sectorGroup, kind);
  const assetStatus = detectAssetStatus(seed);

  const pooled = seed?.storage && "pooled_from" in seed.storage;
  const reason =
    assetStatus === "full_assets"
      ? `on-disk assets for ${curated.item_name}`
      : assetStatus === "zip_only" && !pooled
        ? `source.zip present for ${curated.item_name}`
        : pooled
          ? `curated match ${curated.item_name} — replace pooled copy with real download`
          : `curated match ${curated.item_name} — using sector shell until assets extracted`;

  return {
    seed,
    catalog_item_name: curated.item_name,
    provider,
    slug,
    sector_group: sectorGroup,
    shell_id: shell.id,
    asset_status: assetStatus === "metadata_only" ? "shell_only" : assetStatus,
    selection_reason: reason,
  };
}

/** List on-disk seeds for a pack, grouped by sector. */
export function listPackSeedsBySector(pack_id: string): Record<string, SeedMetadataRecord[]> {
  const seeds = listSeedMetadata().filter((s) => s.pack_ids.includes(pack_id));
  const grouped: Record<string, SeedMetadataRecord[]> = {};
  for (const seed of seeds) {
    const groups = (seed as SeedMetadataRecord & { sector_groups?: string[] }).sector_groups ?? ["other"];
    for (const g of groups) {
      grouped[g] ??= [];
      grouped[g].push(seed);
    }
  }
  return grouped;
}
