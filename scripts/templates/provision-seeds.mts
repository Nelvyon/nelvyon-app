/**
 * Provisions templates/seeds/ from catalog + on-disk Aceternity/Envato assets.
 * Run: pnpm --dir apps/web exec tsx ../../scripts/templates/provision-seeds.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CURATED_SEEDS,
  CURATED_SEED_LIMIT,
  CURATED_SEED_STATS,
  type CuratedSeedMeta,
} from "../../apps/web/src/lib/template-library/curated-seed-library.ts";
import type { SeedCatalogEntry } from "../../apps/web/src/lib/template-library/types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SEEDS_ROOT = path.join(ROOT, "templates/seeds");

type SeedMetadata = {
  item_name: string;
  provider: "EnvatoElements" | "Aceternity";
  license_id: string;
  slug: string;
  seed_id: string;
  quality_score: number;
  primary_kind: string;
  downloaded_at: string;
  nelvyon_project: string;
  redistribution: "none";
  status: "on_disk" | "catalog_registered";
  storage?: {
    source_zip?: string;
    assets_dir?: string;
    extracted_ref?: string;
  };
  pack_ids: string[];
  kinds: string[];
  services: string[];
  sector_groups: string[];
  converted_to: string[];
  notes: string;
};

const ACETERNITY_ON_DISK: Record<
  string,
  { zip: string; extracted: string; seed_id: string; converted_to: string[] }
> = {
  "Foxtrot Marketing Template": {
    zip: "foxtrot-marketing-template.zip",
    extracted: "manuarora700-foxtrot-aceternity-ceff465c7268dcef02ccfd6a574dacf35aa209ff",
    seed_id: "aceternity-foxtrot",
    converted_to: ["landing-saas-demo-v1", "landing-agency-audit-v1"],
  },
  "Proactiv Marketing Template": {
    zip: "proactiv-marketing-template.zip",
    extracted: "manuarora700-proactiv-aceternity-c0e9dc32fd207e736e4ceb6c030fd88ac8489d02",
    seed_id: "aceternity-proactiv",
    converted_to: ["landing-saas-trial-v1"],
  },
  "Simplistic SaaS Template": {
    zip: "simplistic-saas-template.zip",
    extracted: "manuarora700-simplistic-saas-template-369dd51e05e7cecf551eb2e90bfa8150c75ab8f1",
    seed_id: "aceternity-simplistic-saas",
    converted_to: ["landing-saas-demo-v1", "landing-saas-trial-v1"],
  },
  "Productized Agency Template": {
    zip: "productized-agency-template.zip",
    extracted:
      "productized-agency/manuarora700-productized-agency-template-aceternity-48d418fa2899b09137d9456a5cc63b014bb98879",
    seed_id: "aceternity-productized-agency",
    converted_to: ["landing-agency-audit-v1"],
  },
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

function licenseFor(provider: CuratedSeedMeta["provider"]): string {
  return provider === "Aceternity" ? "lic-aceternity-ui-pro-2026" : "lic-envato-elements-2026";
}

function uniqueCatalogItems(): CuratedSeedMeta[] {
  return CURATED_SEEDS;
}

function copyIfExists(src: string, dest: string): boolean {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function copyDirIfExists(src: string, dest: string): boolean {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

function writeMetadata(dir: string, meta: SeedMetadata): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(meta, null, 2) + "\n", "utf8");
}

function provisionItem(entry: CuratedSeedMeta): { on_disk: boolean; path: string } {
  const providerDir = entry.provider === "Aceternity" ? "aceternity" : "envato";
  const slug = slugify(entry.item_name);
  const dir = path.join(SEEDS_ROOT, providerDir, slug);
  const today = new Date().toISOString().slice(0, 10);

  if (entry.provider === "Aceternity" && ACETERNITY_ON_DISK[entry.item_name]) {
    const local = ACETERNITY_ON_DISK[entry.item_name]!;
    const zipSrc = path.join(ROOT, "templates", local.zip);
    const extractedSrc = path.join(ROOT, "templates/_extracted", local.extracted);
    const zipDest = path.join(dir, "source.zip");
    const assetsDest = path.join(dir, "assets");

    const hasZip = copyIfExists(zipSrc, zipDest);
    const hasAssets = copyDirIfExists(extractedSrc, assetsDest);

    writeMetadata(dir, {
      item_name: entry.item_name,
      provider: "Aceternity",
      license_id: licenseFor("Aceternity"),
      slug,
      seed_id: entry.seed_id,
      quality_score: entry.quality_score,
      primary_kind: entry.primary_kind,
      downloaded_at: today,
      nelvyon_project: "template-library",
      redistribution: "none",
      status: hasZip || hasAssets ? "on_disk" : "catalog_registered",
      storage: {
        ...(hasZip ? { source_zip: "source.zip" } : {}),
        ...(hasAssets ? { assets_dir: "assets/", extracted_ref: `templates/_extracted/${local.extracted}` } : {}),
      },
      pack_ids: entry.pack_ids.split(",").map((s) => s.trim()),
      kinds: entry.kinds,
      services: entry.services,
      sector_groups: entry.sector_groups,
      converted_to: local.converted_to,
      notes: `${entry.notes} | seed_id=${local.seed_id}`,
    });
    return { on_disk: hasZip || hasAssets, path: dir };
  }

  writeMetadata(dir, {
    item_name: entry.item_name,
    provider: entry.provider,
    license_id: licenseFor(entry.provider),
    slug,
    seed_id: entry.seed_id,
    quality_score: entry.quality_score,
    primary_kind: entry.primary_kind,
    downloaded_at: today,
    nelvyon_project: "template-library",
    redistribution: "none",
    status: "catalog_registered",
    pack_ids: entry.pack_ids.split(",").map((s) => s.trim()),
    kinds: entry.kinds,
    services: entry.services,
    sector_groups: entry.sector_groups,
    converted_to: [],
    notes: `${entry.notes} | Descargar desde ${entry.provider === "Aceternity" ? "pro.aceternity.com" : "elements.envato.com"} por nombre exacto.`,
  });
  return { on_disk: false, path: dir };
}

function main(): void {
  const items = uniqueCatalogItems();
  let onDisk = 0;
  let catalogOnly = 0;

  for (const entry of items) {
    const result = provisionItem(entry);
    if (result.on_disk) onDisk++;
    else catalogOnly++;
  }

  const indexPath = path.join(SEEDS_ROOT, "index.json");
  fs.mkdirSync(SEEDS_ROOT, { recursive: true });
  fs.writeFileSync(
    indexPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        curated_limit: CURATED_SEED_LIMIT,
        total_items: items.length,
        on_disk: onDisk,
        catalog_registered: catalogOnly,
        stats: CURATED_SEED_STATS,
        aceternity_on_disk: Object.keys(ACETERNITY_ON_DISK),
        roots: {
          aceternity: "templates/seeds/aceternity/",
          envato: "templates/seeds/envato/",
        },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`Provisioned ${items.length} seed slots → ${onDisk} on_disk, ${catalogOnly} catalog_registered`);
  console.log(`Index: ${indexPath}`);
}

main();
