/** Resolve sector from explicit param or brief field */

import type { AutonomousSector } from "./types";
import { SECTOR_IDS, SECTOR_REGISTRY } from "./sectorRegistry";

const ALIASES: Record<string, AutonomousSector> = {
  dental: "dental",
  dentist: "dental",
  dentistas: "dental",
  legal: "legal",
  abogados: "legal",
  law: "legal",
  fitness: "fitness",
  gym: "fitness",
  gimnasio: "fitness",
  gimnasios: "fitness",
  beauty: "beauty",
  aesthetic: "beauty",
  estetica: "beauty",
  "clinica-estetica": "beauty",
  restaurant: "restaurant",
  restaurante: "restaurant",
  restaurantes: "restaurant",
  real_estate: "real_estate",
  realestate: "real_estate",
  inmobiliaria: "real_estate",
  inmobiliarias: "real_estate",
  ecommerce: "ecommerce",
  "e-commerce": "ecommerce",
  tienda: "ecommerce",
  solar: "solar",
  energia: "solar",
  "energia-solar": "solar",
  coaching: "coaching",
  coach: "coaching",
  saas_b2b: "saas_b2b",
  saas: "saas_b2b",
  b2b: "saas_b2b",
};

function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

export function isAutonomousSector(value: string): value is AutonomousSector {
  return (SECTOR_IDS as string[]).includes(value);
}

export function resolveSector(
  input?: string | AutonomousSector | null,
  brief?: Record<string, unknown>,
): AutonomousSector | null {
  if (input && isAutonomousSector(input)) return input;
  if (input) {
    const mapped = ALIASES[normalize(String(input))];
    if (mapped) return mapped;
  }
  const fromBrief = brief?.sector ?? brief?.industry ?? brief?.vertical;
  if (fromBrief) {
    const mapped = ALIASES[normalize(String(fromBrief))];
    if (mapped) return mapped;
  }
  return null;
}

export function listSectors(): AutonomousSector[] {
  return [...SECTOR_IDS];
}

export function sectorAutonomyScore(sector: AutonomousSector): number {
  return SECTOR_REGISTRY[sector].autonomy_score;
}
