export type EliteSectorGroup = "local" | "ecommerce" | "saas_b2b";

export type EliteTemplateCard = {
  id: string;
  sector: string;
  sectorGroup: EliteSectorGroup;
  label: string;
  tagline: string;
  templateId: string;
  previewPath: string;
};

export const ELITE_SECTOR_GROUP_LABELS: Record<EliteSectorGroup, string> = {
  local: "Negocio local",
  ecommerce: "Ecommerce",
  saas_b2b: "SaaS B2B",
};
