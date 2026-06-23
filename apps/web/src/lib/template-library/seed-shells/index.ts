import fs from "node:fs";
import path from "node:path";

export type SeedShellDef = {
  id: string;
  label: string;
  sector_groups: string[];
  kinds: string[];
  file: string;
};

const SHELLS: SeedShellDef[] = [
  {
    id: "food-hospitality-restaurant",
    label: "Restaurante / hostelería (Envato-style)",
    sector_groups: ["food_hospitality", "hospitality_travel"],
    kinds: ["landing", "funnel"],
    file: "food-hospitality-restaurant.html",
  },
  {
    id: "saas-b2b-landing",
    label: "SaaS B2B landing (Aceternity-style)",
    sector_groups: ["saas_tech"],
    kinds: ["landing", "funnel"],
    file: "saas-b2b-landing.html",
  },
  {
    id: "food-hospitality-restaurant",
    label: "Local business fallback",
    sector_groups: ["health_medical", "beauty_wellness", "fitness_sports", "professional", "home_services", "automotive", "education"],
    kinds: ["landing"],
    file: "food-hospitality-restaurant.html",
  },
  {
    id: "saas-b2b-landing",
    label: "Agency / ecommerce fallback",
    sector_groups: ["agency_creator", "ecommerce", "industrial", "other"],
    kinds: ["landing"],
    file: "saas-b2b-landing.html",
  },
];

function shellsDir(): string {
  return path.join(process.cwd(), "src/lib/template-library/seed-shells");
}

export function resolveSectorGroupShell(sectorGroup: string, kind: string): SeedShellDef {
  const match =
    SHELLS.find((s) => s.sector_groups.includes(sectorGroup) && s.kinds.includes(kind)) ??
    SHELLS.find((s) => s.sector_groups.includes(sectorGroup)) ??
    SHELLS[0]!;
  return match;
}

export function loadShellHtml(shellId: string): string {
  const def = SHELLS.find((s) => s.id === shellId) ?? SHELLS[0]!;
  const filePath = path.join(shellsDir(), def.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Seed shell not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

export function listSeedShells(): SeedShellDef[] {
  return SHELLS.filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
}
