/**
 * Top 10 priority sectors for OS pack execution.
 * Only these sectors get pre-loaded seeds and elite prompts.
 * All other sectors in sectorOsRegistry remain available but run without seeds.
 */

export type PrioritySector = {
  id: string;
  label: string;
  pack: "local-business-growth" | "ecommerce-growth" | "saas-b2b-growth";
  seedFile: string;
};

export const TOP_10_SECTORS: readonly PrioritySector[] = [
  { id: "restaurantes",  label: "Restaurantes & Gastronomía", pack: "local-business-growth",  seedFile: "restaurantes" },
  { id: "clinicas",      label: "Clínicas & Salud",           pack: "local-business-growth",  seedFile: "clinicas"     },
  { id: "estetica",      label: "Estética & Belleza",         pack: "local-business-growth",  seedFile: "estetica"     },
  { id: "realestate",    label: "Inmobiliaria",               pack: "local-business-growth",  seedFile: "realestate"   },
  { id: "retail",        label: "Retail & Tiendas",           pack: "local-business-growth",  seedFile: "retail"       },
  { id: "ecommerce",     label: "E-commerce",                 pack: "ecommerce-growth",        seedFile: "ecommerce"    },
  { id: "moda",          label: "Moda & Complementos",        pack: "ecommerce-growth",        seedFile: "moda"         },
  { id: "saasb2b",       label: "SaaS B2B",                   pack: "saas-b2b-growth",         seedFile: "saasb2b"      },
  { id: "consultoria",   label: "Consultoría & Servicios B2B", pack: "saas-b2b-growth",        seedFile: "consultoria"  },
  { id: "fintech",       label: "Fintech & Servicios Financieros", pack: "saas-b2b-growth",   seedFile: "fintech"      },
] as const;

export type PrioritySectorId = (typeof TOP_10_SECTORS)[number]["id"];

const SECTOR_MAP = new Map<string, PrioritySector>(
  TOP_10_SECTORS.map((s) => [s.id, s]),
);

export function isTopSector(sectorId: string): boolean {
  return SECTOR_MAP.has(sectorId);
}

export function getTopSector(sectorId: string): PrioritySector | undefined {
  return SECTOR_MAP.get(sectorId);
}

export function getSectorsForPack(
  pack: PrioritySector["pack"],
): PrioritySector[] {
  return TOP_10_SECTORS.filter((s) => s.pack === pack);
}
