/**
 * Remove pooled internal copies so download-envato-seeds.ts can fetch real ZIPs.
 * Run: pnpm --dir apps/web exec tsx ../../scripts/templates/clear-pooled-seeds.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SEEDS_ROOT = path.join(ROOT, "templates/seeds");

type Meta = {
  slug: string;
  status: string;
  storage?: Record<string, string>;
};

function clearPooled(provider: "envato" | "aceternity"): { unpooled: number; zips_removed: number } {
  const dir = path.join(SEEDS_ROOT, provider);
  let unpooled = 0;
  let zips_removed = 0;
  if (!fs.existsSync(dir)) return { unpooled, zips_removed };

  for (const slug of fs.readdirSync(dir)) {
    const metaPath = path.join(dir, slug, "metadata.json");
    if (!fs.existsSync(metaPath)) continue;
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as Meta;
    const isPooled = Boolean(meta.storage?.pooled_from);
    if (!isPooled) continue;

    const zipPath = path.join(dir, slug, "source.zip");
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      zips_removed++;
    }
    meta.status = "catalog_registered";
    delete meta.storage;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");
    unpooled++;
  }
  return { unpooled, zips_removed };
}

/** Envato: reset all entries that only had pooled zip (486 slots). */
function resetEnvatoForDownload(): { reset: number; zips_removed: number } {
  const dir = path.join(SEEDS_ROOT, "envato");
  let reset = 0;
  let zips_removed = 0;
  if (!fs.existsSync(dir)) return { reset, zips_removed };

  for (const slug of fs.readdirSync(dir)) {
    const metaPath = path.join(dir, slug, "metadata.json");
    if (!fs.existsSync(metaPath)) continue;
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as Meta;
    const zipPath = path.join(dir, slug, "source.zip");
    const hadPooled = Boolean(meta.storage?.pooled_from);

    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      zips_removed++;
    }
    if (hadPooled || meta.status === "on_disk") {
      meta.status = "catalog_registered";
      delete meta.storage;
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");
      reset++;
    }
  }
  return { reset, zips_removed };
}

function main(): void {
  const envato = resetEnvatoForDownload();
  const aceternity = clearPooled("aceternity");
  const stats = {
    generated_at: new Date().toISOString(),
    envato,
    aceternity,
  };
  console.log(JSON.stringify(stats, null, 2));
}

main();
