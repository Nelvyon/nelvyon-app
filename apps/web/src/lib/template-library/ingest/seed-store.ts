/**
 * Reads provisioned seed metadata from templates/seeds/ (filesystem).
 * ZIP/assets are gitignored; metadata.json is the registry anchor.
 */
import fs from "node:fs";
import path from "node:path";

export type SeedMetadataRecord = {
  item_name: string;
  provider: "EnvatoElements" | "Aceternity";
  license_id: string;
  slug: string;
  downloaded_at: string;
  nelvyon_project: string;
  redistribution: "none";
  status: "on_disk" | "catalog_registered";
  storage?: {
    source_zip?: string;
    assets_dir?: string;
    extracted_ref?: string;
    pooled_from?: string;
  };
  pack_ids: string[];
  kinds: string[];
  services: string[];
  sector_groups?: string[];
  converted_to: string[];
  notes: string;
};

export type SeedStoreIndex = {
  generated_at: string;
  curated_limit?: number;
  total_items: number;
  on_disk: number;
  catalog_registered: number;
  stats?: {
    total: number;
    by_provider: Record<string, number>;
    by_kind: Record<string, number>;
  };
  aceternity_on_disk: string[];
  roots: { aceternity: string; envato: string };
};

function repoRoot(): string {
  return path.resolve(process.cwd(), "../..");
}

function seedsRoot(): string {
  const fromWeb = path.join(process.cwd(), "../../templates/seeds");
  if (fs.existsSync(fromWeb)) return fromWeb;
  return path.join(repoRoot(), "templates/seeds");
}

export function loadSeedStoreIndex(): SeedStoreIndex | null {
  const indexPath = path.join(seedsRoot(), "index.json");
  if (!fs.existsSync(indexPath)) return null;
  return JSON.parse(fs.readFileSync(indexPath, "utf8")) as SeedStoreIndex;
}

export function listSeedMetadata(): SeedMetadataRecord[] {
  const root = seedsRoot();
  const out: SeedMetadataRecord[] = [];
  for (const provider of ["aceternity", "envato"] as const) {
    const providerDir = path.join(root, provider);
    if (!fs.existsSync(providerDir)) continue;
    for (const slug of fs.readdirSync(providerDir)) {
      const metaPath = path.join(providerDir, slug, "metadata.json");
      if (!fs.existsSync(metaPath)) continue;
      out.push(JSON.parse(fs.readFileSync(metaPath, "utf8")) as SeedMetadataRecord);
    }
  }
  return out;
}

export function getSeedBySlug(provider: "aceternity" | "envato", slug: string): SeedMetadataRecord | null {
  const metaPath = path.join(seedsRoot(), provider, slug, "metadata.json");
  if (!fs.existsSync(metaPath)) return null;
  return JSON.parse(fs.readFileSync(metaPath, "utf8")) as SeedMetadataRecord;
}

export function getSeedsForPack(pack_id: string): SeedMetadataRecord[] {
  return listSeedMetadata().filter((s) => s.pack_ids.includes(pack_id));
}

export function getOnDiskSeedsForPack(pack_id: string): SeedMetadataRecord[] {
  return getSeedsForPack(pack_id).filter((s) => s.status === "on_disk");
}

export function seedStoreStats() {
  const all = listSeedMetadata();
  return {
    total: all.length,
    on_disk: all.filter((s) => s.status === "on_disk").length,
    catalog_registered: all.filter((s) => s.status === "catalog_registered").length,
    aceternity: all.filter((s) => s.provider === "Aceternity").length,
    envato: all.filter((s) => s.provider === "EnvatoElements").length,
  };
}
