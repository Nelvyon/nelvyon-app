/**
 * seedPersonalizer — applies business intake data to a seed template.
 * Never ships raw seeds to the portal. Every deliverable MUST go through this.
 *
 * Placeholders: {{business_name}}, {{city}}, {{value_proposition}}, {{primary_cta}}
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SEEDS_DIR = join(dirname(fileURLToPath(import.meta.url)), "seeds");

export type SeedRecord = {
  id: string;
  headline: string;
  meta_title: string;
  cta_label: string;
  chatbot_greeting: string;
};

export type PersonalizerIntake = {
  business_name: string;
  city?: string;
  value_proposition?: string;
  primary_cta?: string;
};

export type PersonalizedSeed = {
  seed_id: string;
  headline: string;
  meta_title: string;
  cta_label: string;
  chatbot_greeting: string;
  personalized: true;
};

let seedCache: Map<string, SeedRecord[]> = new Map();

function loadSeeds(sectorId: string): SeedRecord[] {
  const cached = seedCache.get(sectorId);
  if (cached) return cached;
  const filePath = join(SEEDS_DIR, `${sectorId}.json`);
  if (!existsSync(filePath)) return [];
  const records = JSON.parse(readFileSync(filePath, "utf8")) as SeedRecord[];
  seedCache.set(sectorId, records);
  return records;
}

function interpolate(template: string, intake: PersonalizerIntake): string {
  return template
    .replace(/\{\{business_name\}\}/g, intake.business_name)
    .replace(/\{\{city\}\}/g, intake.city ?? "tu ciudad")
    .replace(/\{\{value_proposition\}\}/g, intake.value_proposition ?? "calidad y servicio")
    .replace(/\{\{primary_cta\}\}/g, intake.primary_cta ?? "Contáctanos");
}

/** Returns a personalized seed for the given sector. Picks seed by index for determinism. */
export function personalizeSeed(
  sectorId: string,
  intake: PersonalizerIntake,
  index = 0,
): PersonalizedSeed | null {
  const seeds = loadSeeds(sectorId);
  if (seeds.length === 0) return null;
  const seed = seeds[index % seeds.length];
  return {
    seed_id: seed.id,
    headline: interpolate(seed.headline, intake),
    meta_title: interpolate(seed.meta_title, intake),
    cta_label: seed.cta_label,
    chatbot_greeting: interpolate(seed.chatbot_greeting, intake),
    personalized: true,
  };
}

/** Returns multiple personalized seeds (e.g., for A/B variant generation). */
export function personalizeSeeds(
  sectorId: string,
  intake: PersonalizerIntake,
  count = 3,
): PersonalizedSeed[] {
  const seeds = loadSeeds(sectorId);
  if (seeds.length === 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const seed = seeds[i % seeds.length];
    return {
      seed_id: seed.id,
      headline: interpolate(seed.headline, intake),
      meta_title: interpolate(seed.meta_title, intake),
      cta_label: seed.cta_label,
      chatbot_greeting: interpolate(seed.chatbot_greeting, intake),
      personalized: true as const,
    };
  });
}

/** Returns count of available seeds for a sector (0 = no seeds loaded yet). */
export function getSeedCount(sectorId: string): number {
  return loadSeeds(sectorId).length;
}

/** Reset cache (useful in tests). */
export function resetSeedCache(): void {
  seedCache = new Map();
}
