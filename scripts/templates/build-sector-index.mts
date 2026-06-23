/**
 * Builds templates/seeds/by-sector/index.json — sector × service × seed lookup.
 * Run: pnpm --dir apps/web exec tsx ../../scripts/templates/build-sector-index.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SEEDS_ROOT = path.join(ROOT, "templates/seeds");
const OUT_DIR = path.join(SEEDS_ROOT, "by-sector");

type Meta = {
  slug: string;
  item_name: string;
  provider: string;
  status: string;
  quality_score?: number;
  primary_kind?: string;
  sector_groups?: string[];
  services?: string[];
  kinds?: string[];
  pack_ids?: string[];
  storage?: Record<string, string>;
};

function readMeta(provider: string, slug: string): Meta | null {
  const p = path.join(SEEDS_ROOT, provider, slug, "metadata.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as Meta;
}

function listMetas(provider: "envato" | "aceternity"): Meta[] {
  const dir = path.join(SEEDS_ROOT, provider);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((slug) => readMeta(provider, slug))
    .filter((m): m is Meta => m !== null);
}

function assetStatus(provider: string, m: Meta): string {
  const zipPath = path.join(SEEDS_ROOT, provider, m.slug, "source.zip");
  const assetsPath = path.join(SEEDS_ROOT, provider, m.slug, "assets");
  if (fs.existsSync(assetsPath)) return "full_assets";
  if (fs.existsSync(zipPath)) {
    return m.storage?.pooled_from ? "pooled_zip" : "unique_zip";
  }
  return "metadata_only";
}

type IndexEntry = {
  slug: string;
  item_name: string;
  provider: string;
  pack_ids: string[];
  kinds: string[];
  services: string[];
  quality_score: number;
  asset_status: string;
};

function main(): void {
  const all = [...listMetas("envato"), ...listMetas("aceternity")];
  const bySector: Record<string, IndexEntry[]> = {};
  const byService: Record<string, IndexEntry[]> = {};
  const byPack: Record<string, IndexEntry[]> = {};

  for (const m of all) {
    const provider = m.provider === "Aceternity" ? "aceternity" : "envato";
    const entry: IndexEntry = {
      slug: m.slug,
      item_name: m.item_name,
      provider,
      pack_ids: m.pack_ids ?? [],
      kinds: m.kinds ?? [],
      services: m.services ?? [],
      quality_score: m.quality_score ?? 80,
      asset_status: assetStatus(provider, m),
    };

    for (const g of m.sector_groups ?? ["other"]) {
      bySector[g] ??= [];
      bySector[g].push(entry);
    }
    for (const s of m.services ?? []) {
      byService[s] ??= [];
      byService[s].push(entry);
    }
    for (const p of m.pack_ids ?? []) {
      byPack[p] ??= [];
      byPack[p].push(entry);
    }
  }

  // Sort by quality within each bucket
  const sortEntries = (entries: IndexEntry[]) =>
    entries.sort((a, b) => b.quality_score - a.quality_score);

  for (const key of Object.keys(bySector)) sortEntries(bySector[key]!);
  for (const key of Object.keys(byService)) sortEntries(byService[key]!);
  for (const key of Object.keys(byPack)) sortEntries(byPack[key]!);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const index = {
    generated_at: new Date().toISOString(),
    total_seeds: all.length,
    sector_groups: Object.keys(bySector).sort(),
    services: Object.keys(byService).sort(),
    packs: Object.keys(byPack).sort(),
    by_sector: bySector,
    by_service: byService,
    by_pack: byPack,
  };

  fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2) + "\n", "utf8");

  // Per-sector summary files (lighter for browsing)
  for (const [sector, entries] of Object.entries(bySector)) {
    fs.writeFileSync(
      path.join(OUT_DIR, `${sector}.json`),
      JSON.stringify({ sector_group: sector, count: entries.length, seeds: entries.slice(0, 50) }, null, 2) + "\n",
      "utf8",
    );
  }

  console.log(
    JSON.stringify(
      {
        total: all.length,
        sector_groups: Object.keys(bySector).length,
        services: Object.keys(byService).length,
        output: OUT_DIR,
      },
      null,
      2,
    ),
  );
}

main();
