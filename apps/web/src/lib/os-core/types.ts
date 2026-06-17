/** NELVYON OS — internal layer types (not exposed to end users). */

export type MarketingDiscipline =
  | "seo"
  | "sem_ads"
  | "social"
  | "email"
  | "content"
  | "cro"
  | "analytics"
  | "strategy"
  | "branding"
  | "landing_funnel"
  | "automation"
  | "reputation";

export type BusinessVertical =
  | "local"
  | "ecommerce"
  | "b2b_saas"
  | "info_products"
  | "marketplace"
  | "agency"
  | "generic";

export type OsAgentTier = "premium" | "sector" | "autonomous";

export type OsAgentDefinition = {
  id: string;
  name: string;
  discipline: MarketingDiscipline;
  tier: OsAgentTier;
  verticals: BusinessVertical[];
  responsibility: string;
  inputs: string[];
  outputs: string[];
  promptRole?: string;
  osServiceId?: string;
  sectorPath?: string;
};

export type ProcessTemplateCategory =
  | "seo"
  | "ads"
  | "social"
  | "email"
  | "landing_funnel"
  | "brand"
  | "deliverable"
  | "saas_ops";

export type ProcessTemplate = {
  id: string;
  category: ProcessTemplateCategory;
  name: string;
  description: string;
  discipline: MarketingDiscipline;
  verticals: BusinessVertical[];
  agentIds: string[];
  steps: string[];
  deliverables: string[];
  estimatedHours: number;
};

export type ConnectorStatus = "live" | "stub" | "oauth_ready" | "planned";

export type ConnectorDefinition = {
  id: string;
  name: string;
  category: "analytics" | "ads" | "seo" | "crm" | "email" | "social" | "commerce" | "comms";
  status: ConnectorStatus;
  envKeys: string[];
  scopes?: string[];
  servicePath?: string;
  apiRoutePrefix?: string;
  notes?: string;
};

export type OsHealthSurface = {
  agentsRegistered: number;
  processTemplates: number;
  connectorsLive: number;
  connectorsStub: number;
};
