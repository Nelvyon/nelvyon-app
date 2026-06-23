/**
 * NELVYON Template Library — canonical types.
 * Seeds (Envato Elements / Aceternity) are NEVER served to clients; only nelvyon_native compositions ship.
 */

/** Marketing services aligned with SERVICE_PACK_CATALOG + OS premium verticals. */
export type TemplateService =
  | "seo"
  | "ads"
  | "email"
  | "landing"
  | "funnel"
  | "ecommerce"
  | "saas_b2b"
  | "local"
  | "agency"
  | "social"
  | "content"
  | "cro"
  | "analytics"
  | "brand"
  | "chatbot"
  | "automation"
  | "report";

export type TemplateKind =
  | "block"
  | "landing"
  | "funnel"
  | "email_sequence"
  | "email"
  | "ad_creative"
  | "seo_page"
  | "content_page"
  | "automation_recipe"
  | "report_section";

/** 40+ sectors — packs and catalog resolve templates by sector + service. */
export type TemplateSector =
  | "restaurant"
  | "cafe"
  | "dental"
  | "clinic"
  | "medical"
  | "legal"
  | "accounting"
  | "real_estate"
  | "fitness"
  | "gym"
  | "beauty"
  | "spa"
  | "salon"
  | "veterinary"
  | "automotive"
  | "plumber"
  | "electrician"
  | "cleaning"
  | "landscaping"
  | "hotel"
  | "tourism"
  | "education"
  | "tutoring"
  | "ecommerce_fashion"
  | "ecommerce_electronics"
  | "ecommerce_food"
  | "ecommerce_beauty"
  | "ecommerce_home"
  | "marketplace"
  | "saas_b2b"
  | "saas_b2c"
  | "agency"
  | "freelancer"
  | "coach"
  | "infoproduct"
  | "course"
  | "nonprofit"
  | "solar"
  | "construction"
  | "wedding"
  | "photography"
  | "general";

export type TemplateVertical = "local" | "ecommerce" | "saas_b2b" | "agency" | "creator";

export type TemplateLanguage = "es" | "en" | "pt" | "fr" | "de" | "it";

export type TemplateSource =
  | "nelvyon_native"
  | "aceternity_seed"
  | "envato_elements_seed";

export type TemplateStatus = "active" | "review" | "deprecated" | "seed_only";

export type LicenseRedistribution = "none" | "client_deliverable" | "internal_only";

export type SeedLicenseRecord = {
  license_id: string;
  vendor: "envato_elements" | "aceternity_ui_pro" | "other";
  subscription_ref?: string;
  purchased_at?: string;
  redistribution: LicenseRedistribution;
  notes: string;
};

export type TemplateScores = {
  quality: number;
  conversion: number;
  speed: number;
  premium: number;
};

/** Block catalog entry — maps to LandingBlock types in builders. */
export type BlockCatalogEntry = {
  block_type: string;
  variant: string;
  props_schema: Record<string, string>;
};

export type NelvyonTemplateEntry = {
  id: string;
  name: string;
  kind: TemplateKind;
  service: TemplateService;
  sector: TemplateSector | "all";
  verticals: TemplateVertical[];
  languages: TemplateLanguage[];
  tags: string[];
  source: TemplateSource;
  /** Always true for client-facing templates after seed conversion. */
  nelvyon_owned: boolean;
  status: TemplateStatus;
  scores: TemplateScores;
  /** Seed templates reference license; native templates omit. */
  license_id?: string;
  /** Source seed id if derived from external pack. */
  derived_from_seed?: string;
  pack_ids?: string[];
  /** For landings/funnels: ordered block type ids or composition ref. */
  composition?: string[];
  block_catalog_ref?: string;
  preview_path?: string;
  description?: string;
};

export type TemplateLibraryQuery = {
  service?: TemplateService;
  kind?: TemplateKind;
  sector?: TemplateSector;
  vertical?: TemplateVertical;
  language?: TemplateLanguage;
  pack_id?: string;
  source?: TemplateSource;
  status?: TemplateStatus;
  min_quality?: number;
  tag?: string;
  limit?: number;
};

export type TemplateResolveInput = {
  service: TemplateService;
  kind: TemplateKind;
  sector: TemplateSector;
  vertical?: TemplateVertical;
  language?: TemplateLanguage;
  pack_id?: string;
};

export type TemplateResolveResult = {
  template: NelvyonTemplateEntry;
  alternates: NelvyonTemplateEntry[];
};

export type SeedProvider = "EnvatoElements" | "Aceternity";

export type SeedCatalogEntry = {
  provider: SeedProvider;
  item_name: string;
  kinds: string[];
  services: string[];
  match: { groups?: string[]; sectors?: string[] };
  pack_ids: string;
  lang: string;
  notes: string;
};
