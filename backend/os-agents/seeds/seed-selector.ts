/**
 * seed-selector.ts — Picks seed items for sector agents.
 *
 * Priority:
 * 1. Envato seeds on-disk at backend/data/envato-seeds/{sector}/*.json (metadata)
 * 2. Synthetic JSON seeds at backend/os-agents/seeds/{sector}.json
 *
 * Envato seeds are downloaded with `download-envato-seeds.ts` and stored as
 * individual metadata JSON files (not ZIPs). Re-download when ENVATO_ELEMENTS_TOKEN
 * is available and seeds need refreshing.
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

function resolveRoots(overrideRoot?: string): { envatoDir: string; syntheticDir: string } {
  const base = overrideRoot ?? path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
    "../..",
  );
  return {
    envatoDir: path.join(base, "data", "envato-seeds"),
    syntheticDir: path.join(base, "os-agents", "seeds"),
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
 * Get seeds for a sector. Prefers Envato on-disk seeds over synthetic JSON.
 * @param sector      - e.g. restaurantes, clinicas, ecommerce
 * @param limit       - max seeds to return (default 20)
 * @param _rootOverride - optional root dir for testing
 */
export function getSectorSeeds(sector: string, limit = 20, _rootOverride?: string): SectorSeed[] {
  const { envatoDir, syntheticDir } = resolveRoots(_rootOverride);
  const envatoSeeds = loadEnvatoSeeds(sector, envatoDir);
  if (envatoSeeds.length > 0) return envatoSeeds.slice(0, limit);
  return loadSyntheticSeeds(sector, syntheticDir).slice(0, limit);
}

/**
 * Get a single seed by index (wraps around) for deterministic selection.
 * Used by sector agents to pick a seed template given a job index.
 */
export function getSeedByIndex(sector: string, index: number, _rootOverride?: string): SectorSeed | null {
  const seeds = getSectorSeeds(sector, 20, _rootOverride);
  if (!seeds.length) return null;
  return seeds[index % seeds.length];
}
