/**
 * seed-selector.ts — Picks seed items for sector agents.
 *
 * Priority:
 * 1. Envato seeds on-disk at backend/data/envato-seeds/{sector}/*.json (individual files)
 * 2. Envato metadata index at backend/data/envato-seeds-metadata.json (500 entries, 10 sectors × 50)
 * 3. Synthetic JSON seeds at backend/os-agents/seeds/{sector}.json
 *
 * Envato on-disk files are downloaded with `download-envato-seeds.ts`.
 * The metadata index is the committed catalog — usable without ZIPs.
 */
import * as fs from "node:fs";
import * as path from "node:path";

export type SectorSeed = {
  id: string;
  headline: string;
  meta_title: string;
  cta_label: string;
  chatbot_greeting: string;
  source: "envato" | "synthetic";
};

type MetadataEntry = {
  id: string; sector: string; source: "envato" | "synthetic";
  headline: string; meta_title: string; cta_label: string;
  chatbot_greeting: string; downloaded_at: string | null; envato_id: string | null;
};

function resolveRoots(overrideRoot?: string): { envatoDir: string; syntheticDir: string; metadataFile: string } {
  const base = overrideRoot ?? path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
    "../..",
  );
  return {
    envatoDir: path.join(base, "data", "envato-seeds"),
    syntheticDir: path.join(base, "os-agents", "seeds"),
    metadataFile: path.join(base, "data", "envato-seeds-metadata.json"),
  };
}

function loadEnvatoSeeds(sector: string, envatoDir: string): SectorSeed[] {
  const dir = path.join(envatoDir, sector);
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as Record<string, unknown>;
        return {
          id: String(raw.id ?? f.replace(".json", "")),
          headline: String(raw.headline ?? raw.name ?? ""),
          meta_title: String(raw.meta_title ?? raw.title ?? ""),
          cta_label: String(raw.cta_label ?? "Ver más"),
          chatbot_greeting: String(raw.chatbot_greeting ?? "¡Hola! ¿En qué puedo ayudarte?"),
          source: "envato" as const,
        };
      })
      .filter((s) => s.headline);
  } catch {
    return [];
  }
}

function loadMetadataSeeds(sector: string, metadataFile: string): SectorSeed[] {
  if (!fs.existsSync(metadataFile)) return [];
  try {
    const entries = JSON.parse(fs.readFileSync(metadataFile, "utf-8")) as MetadataEntry[];
    return entries
      .filter((e) => e.sector === sector && e.headline)
      .map((e) => ({
        id: e.id,
        headline: e.headline,
        meta_title: e.meta_title,
        cta_label: e.cta_label,
        chatbot_greeting: e.chatbot_greeting,
        source: e.source,
      }));
  } catch {
    return [];
  }
}

function loadSyntheticSeeds(sector: string, syntheticDir: string): SectorSeed[] {
  const file = path.join(syntheticDir, `${sector}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as unknown[];
    return (raw as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id ?? ""),
      headline: String(item.headline ?? ""),
      meta_title: String(item.meta_title ?? ""),
      cta_label: String(item.cta_label ?? ""),
      chatbot_greeting: String(item.chatbot_greeting ?? ""),
      source: "synthetic" as const,
    }));
  } catch {
    return [];
  }
}

/**
 * Get seeds for a sector. Priority: on-disk envato files > metadata index > synthetic JSON.
 * @param sector        - e.g. dental, restaurant, ecommerce
 * @param limit         - max seeds to return (default 50)
 * @param _rootOverride - optional root dir for testing
 */
export function getSectorSeeds(sector: string, limit = 50, _rootOverride?: string): SectorSeed[] {
  const { envatoDir, syntheticDir, metadataFile } = resolveRoots(_rootOverride);

  const onDisk = loadEnvatoSeeds(sector, envatoDir);
  if (onDisk.length > 0) return onDisk.slice(0, limit);

  const metadata = loadMetadataSeeds(sector, metadataFile);
  if (metadata.length > 0) return metadata.slice(0, limit);

  return loadSyntheticSeeds(sector, syntheticDir).slice(0, limit);
}

/**
 * Get a single seed by index (wraps around) for deterministic selection.
 * Used by sector agents to pick a seed template given a job index.
 */
export function getSeedByIndex(sector: string, index: number, _rootOverride?: string): SectorSeed | null {
  const seeds = getSectorSeeds(sector, 50, _rootOverride);
  if (!seeds.length) return null;
  return seeds[index % seeds.length];
}

/**
 * Returns sectors sorted by CVR descending (highest-converting first).
 * Sectors not in weights map fall to the end, sorted alphabetically.
 *
 * @param weights - Record<sector, cvr> from OsLearningService.getSectorWeights()
 * @param n       - how many top sectors to return (0 = all)
 */
export function getTopSectorsByCvr(weights: Record<string, number>, n = 0): string[] {
  const all = Object.keys(weights).sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0));
  return n > 0 ? all.slice(0, n) : all;
}

/**
 * Re-ranks seeds within a sector by boosting those from higher-tier sources
 * when the sector has an above-average CVR.
 *
 * Concretely: if the sector CVR >= avgCvr, envato/metadata seeds are kept first;
 * if below average, synthetic seeds are surfaced earlier to try new templates.
 *
 * @param seeds   - seeds array from getSectorSeeds()
 * @param sectorCvr - CVR for this sector (0 if unknown)
 * @param avgCvr    - average CVR across all sectors (0 if unknown)
 */
export function rankSeedsByCvr(seeds: SectorSeed[], sectorCvr: number, avgCvr: number): SectorSeed[] {
  if (sectorCvr >= avgCvr) return seeds; // already sorted envato > metadata > synthetic
  // Below average: interleave synthetic seeds earlier to explore new templates
  const envato = seeds.filter((s) => s.source === "envato");
  const synthetic = seeds.filter((s) => s.source === "synthetic");
  const other = seeds.filter((s) => s.source !== "envato" && s.source !== "synthetic");
  const interleaved: SectorSeed[] = [];
  const max = Math.max(envato.length, synthetic.length);
  for (let i = 0; i < max; i++) {
    if (i < synthetic.length) interleaved.push(synthetic[i]);
    if (i < envato.length) interleaved.push(envato[i]);
  }
  return [...interleaved, ...other];
}
