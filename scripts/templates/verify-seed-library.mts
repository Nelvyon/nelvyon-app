/**
 * Verifies physical seed assets in templates/seeds/.
 * Run: pnpm --dir apps/web exec tsx ../../scripts/templates/verify-seed-library.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SEEDS_ROOT = path.join(ROOT, "templates/seeds");

type Meta = {
  slug: string;
  item_name: string;
  provider: string;
  status: string;
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

function hasZip(provider: string, slug: string): boolean {
  return fs.existsSync(path.join(SEEDS_ROOT, provider, slug, "source.zip"));
}

function hasAssets(provider: string, slug: string): boolean {
  const assetsDir = path.join(SEEDS_ROOT, provider, slug, "assets");
  return fs.existsSync(assetsDir) && fs.readdirSync(assetsDir).length > 0;
}

function main(): void {
  const all = [...listMetas("envato"), ...listMetas("aceternity")];
  let realZip = 0;
  let realAssets = 0;
  let pooled = 0;
  let metadataOnly = 0;

  const bySector: Record<string, { total: number; real: number; pooled: number }> = {};

  for (const m of all) {
    const provider = m.provider === "Aceternity" ? "aceternity" : "envato";
    const zip = hasZip(provider, m.slug);
    const assets = hasAssets(provider, m.slug);
    const isPooled = Boolean(m.storage?.pooled_from);

    if (assets) realAssets++;
    if (zip && !isPooled) realZip++;
    if (isPooled) pooled++;
    if (!zip && !assets) metadataOnly++;

    for (const g of m.sector_groups ?? ["other"]) {
      bySector[g] ??= { total: 0, real: 0, pooled: 0 };
      bySector[g].total++;
      if ((zip && !isPooled) || assets) bySector[g].real++;
      if (isPooled) bySector[g].pooled++;
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    total_metadata: all.length,
    real_unique_zip: realZip,
    real_extracted_assets: realAssets,
    pooled_internal_copies: pooled,
    metadata_only: metadataOnly,
    by_sector_group: bySector,
    action_required:
      realZip + realAssets < all.length
        ? "Run download-envato-seeds.ts with Envato login, then extract assets. Do NOT rely on pooled copies for production."
        : "All seeds have unique assets on disk.",
  };

  const outPath = path.join(SEEDS_ROOT, "verify-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (metadataOnly > 0 || pooled > realZip) {
    console.warn(
      `\n⚠ ${metadataOnly} seeds sin ZIP/assets físicos · ${pooled} son copias pooled (no descargas reales).`,
    );
    console.warn("  Descarga real: pnpm --dir apps/web exec tsx scripts/download-envato-seeds.ts");
    process.exitCode = 1;
  }
}

main();
