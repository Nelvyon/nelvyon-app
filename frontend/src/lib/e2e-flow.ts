/**
 * E2E Flow Utilities for NELVYON — v3
 * Full chain: Clients → Projects → Generator → QA → Assets → Contracts → Social → Helpdesk
 * CRM bridge: Contacts ↔ Clients, Deals ↔ Projects, Campaigns ↔ Projects
 *
 * v3 additions:
 * - CRM ↔ OS bridge utilities
 * - Deal/Campaign creation from project
 * - Full chain retrieval
 * - Enhanced relationship types with assets, deals, campaigns
 */

export interface E2EStep {
  id: string;
  label: string;
  path: string;
  icon: string;
  description: string;
  /** Modules this step can create entities in */
  canCreateIn?: string[];
}

export const E2E_STEPS: E2EStep[] = [
  {
    id: "clients", label: "Clientes", path: "/clients", icon: "Users",
    description: "Perfil del cliente", canCreateIn: ["projects"],
  },
  {
    id: "projects", label: "Proyectos", path: "/projects", icon: "FolderKanban",
    description: "Gestión de proyectos", canCreateIn: ["generator", "contracts", "deals"],
  },
  {
    id: "generator", label: "Generador", path: "/generator", icon: "Hammer",
    description: "Generación de contenido", canCreateIn: ["qa"],
  },
  {
    id: "qa", label: "QA", path: "/qa", icon: "ShieldCheck",
    description: "Control de calidad", canCreateIn: ["assets"],
  },
  {
    id: "assets", label: "Assets", path: "/assets", icon: "Image",
    description: "Entregables finales", canCreateIn: ["contracts"],
  },
  {
    id: "contracts", label: "Contratos", path: "/saas/contracts", icon: "FileText",
    description: "Contratos y firmas", canCreateIn: ["social"],
  },
  {
    id: "social", label: "Social", path: "/saas/social", icon: "Share2",
    description: "Publicación social", canCreateIn: ["helpdesk"],
  },
  {
    id: "helpdesk", label: "Helpdesk", path: "/saas/helpdesk", icon: "LifeBuoy",
    description: "Soporte e incidencias", canCreateIn: [],
  },
];

/** CRM modules that bridge to OS */
export const CRM_MODULES = [
  { id: "contacts", label: "Contactos", path: "/crm/contacts", icon: "UserCircle" },
  { id: "deals", label: "Deals", path: "/crm/deals", icon: "Handshake" },
  { id: "campaigns", label: "Campañas", path: "/crm/campaigns", icon: "Megaphone" },
] as const;

export function getCurrentStepIndex(currentPath: string): number {
  return E2E_STEPS.findIndex((s) => currentPath.startsWith(s.path));
}

export function getNextStep(currentPath: string): E2EStep | null {
  const idx = getCurrentStepIndex(currentPath);
  if (idx < 0 || idx >= E2E_STEPS.length - 1) return null;
  return E2E_STEPS[idx + 1];
}

export function getPrevStep(currentPath: string): E2EStep | null {
  const idx = getCurrentStepIndex(currentPath);
  if (idx <= 0) return null;
  return E2E_STEPS[idx - 1];
}

/** Build a navigation URL with query params for E2E context */
export function buildE2EUrl(
  basePath: string,
  params: Record<string, string | number | undefined>,
): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== 0) {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Parse E2E query params from URL */
export function parseE2EParams(search: string): {
  client_id?: number;
  project_id?: number;
  output_id?: number;
  contract_id?: number;
  campaign_name?: string;
  social_post_id?: number;
  deal_id?: number;
  contact_id?: number;
  content?: string;
  source?: string;
} {
  const params = new URLSearchParams(search);
  return {
    client_id: params.get("client_id") ? Number(params.get("client_id")) : undefined,
    project_id: params.get("project_id") ? Number(params.get("project_id")) : undefined,
    output_id: params.get("output_id") ? Number(params.get("output_id")) : undefined,
    contract_id: params.get("contract_id") ? Number(params.get("contract_id")) : undefined,
    campaign_name: params.get("campaign_name") || undefined,
    social_post_id: params.get("social_post_id") ? Number(params.get("social_post_id")) : undefined,
    deal_id: params.get("deal_id") ? Number(params.get("deal_id")) : undefined,
    contact_id: params.get("contact_id") ? Number(params.get("contact_id")) : undefined,
    content: params.get("content") || undefined,
    source: params.get("source") || undefined,
  };
}

/** Check if a project status blocks downstream actions */
export function isProjectBlocked(status?: string): boolean {
  return status === "closed" || status === "cancelled" || status === "archived";
}

/** Get a human-readable label for the E2E origin */
export function getOriginLabel(source?: string): string {
  switch (source) {
    case "qa_approved": return "Aprobado en QA";
    case "generator": return "Desde Generador";
    case "assets": return "Desde Assets";
    case "social_incident": return "Incidencia Social";
    case "contract": return "Desde Contrato";
    case "contract_signed": return "Contrato Firmado";
    case "social_failed": return "Post Fallido";
    case "social_report": return "Reporte Social";
    case "project": return "Desde Proyecto";
    case "deal": return "Desde Deal";
    case "campaign": return "Desde Campaña";
    default: return source || "";
  }
}

/**
 * E2E State Propagation Rules
 */
export interface PropagationEffect {
  module: string;
  action: string;
  description: string;
}

export function getStatePropagationEffects(projectStatus: string): PropagationEffect[] {
  switch (projectStatus) {
    case "closed":
    case "cancelled":
      return [
        { module: "Generator", action: "block_generation", description: "Bloquea nuevas generaciones" },
        { module: "QA", action: "block_validation", description: "Bloquea nuevas validaciones" },
        { module: "Contracts", action: "expire_drafts", description: "Marca borradores como expirados" },
        { module: "Social", action: "pause_scheduled", description: "Pausa posts programados" },
        { module: "Helpdesk", action: "notify", description: "Notifica tickets abiertos" },
        { module: "CRM/Deals", action: "update_stage", description: "Deals → lost/closed" },
      ];
    case "approved":
    case "delivered":
      return [
        { module: "Contracts", action: "enable_signing", description: "Habilita firma de contratos" },
        { module: "Social", action: "enable_publishing", description: "Habilita publicación" },
        { module: "Assets", action: "mark_final", description: "Marca assets como finales" },
      ];
    default:
      return [];
  }
}

/**
 * E2E Relationship Context — persisted data that links entities across modules
 */
export interface E2ERelationship {
  client_id?: number;
  client_name?: string;
  project_id?: number;
  project_name?: string;
  project_status?: string;
  output_id?: number;
  contract_id?: number;
  contract_title?: string;
  campaign_name?: string;
  social_post_id?: number;
  ticket_id?: number;
  deal_id?: number;
  contact_id?: number;
}

/**
 * Extended relationship counts from backend
 */
export interface E2ERelationshipCounts {
  outputs_count: number;
  assets_count: number;
  contracts_count: number;
  social_posts_count: number;
  tickets_count: number;
  deals_count: number;
  campaigns_count: number;
}

/** Build a compact relationship summary for display */
export function formatRelationshipChain(rel: E2ERelationship): string {
  const parts: string[] = [];
  if (rel.client_name) parts.push(`👤 ${rel.client_name}`);
  if (rel.project_name) parts.push(`📁 ${rel.project_name}`);
  if (rel.output_id) parts.push(`📄 Output #${rel.output_id}`);
  if (rel.contract_title) parts.push(`📝 ${rel.contract_title}`);
  if (rel.campaign_name) parts.push(`📢 ${rel.campaign_name}`);
  if (rel.social_post_id) parts.push(`📱 Post #${rel.social_post_id}`);
  if (rel.ticket_id) parts.push(`🎫 Ticket #${rel.ticket_id}`);
  if (rel.deal_id) parts.push(`💰 Deal #${rel.deal_id}`);
  return parts.join(" → ");
}

/**
 * Determine which E2E actions are available from a given module
 */
export function getAvailableE2EActions(
  currentModule: string,
  context: E2ERelationship,
): Array<{ action: string; label: string; targetModule: string; icon: string }> {
  const actions: Array<{ action: string; label: string; targetModule: string; icon: string }> = [];

  if (currentModule === "projects" && context.project_id) {
    actions.push(
      { action: "contract-from-project", label: "Crear Contrato", targetModule: "contracts", icon: "FileText" },
      { action: "deal-from-project", label: "Crear Deal", targetModule: "deals", icon: "Handshake" },
    );
  }

  if (currentModule === "contracts" && context.contract_id) {
    actions.push(
      { action: "social-from-contract", label: "Lanzar a Social", targetModule: "social", icon: "Share2" },
    );
  }

  if (currentModule === "social" && context.social_post_id) {
    actions.push(
      { action: "social-to-ticket", label: "Crear Ticket", targetModule: "helpdesk", icon: "LifeBuoy" },
    );
  }

  return actions;
}