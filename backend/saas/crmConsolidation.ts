/**
 * Fase 1A — CRM SaaS: fuente oficial y rutas legacy congeladas.
 * No añadir nuevos imports de servicios legacy para escritura de contactos.
 * Ver docs/PHASE_1A_CRM_TRANSITION.md
 */

export const SAAS_CRM_SOURCE_OF_TRUTH = {
  table: "saas_contacts",
  service: "SaasCrmService",
  apiPrefix: "/api/saas/crm",
  uiPath: "/saas/crm",
} as const;

/** Tablas legacy — escrituras permitidas solo en rutas listadas hasta migración ETL. */
export const LEGACY_CONTACT_STORES = {
  contacts: {
    table: "contacts",
    isolation: "workspace_id",
    idType: "integer",
    status: "legacy",
  },
  crm_contacts_workspace: {
    table: "crm_contacts",
    isolation: "workspace_id",
    idType: "uuid",
    status: "legacy",
  },
  crm_contacts_os: {
    table: "crm_contacts",
    isolation: "user_id",
    idType: "uuid",
    status: "legacy",
  },
} as const;

/**
 * Inventario congelado de rutas con escritura legacy (Fase 1A).
 * Si añades un archivo que escriba en contacts/crm_contacts, actualiza esta lista y el test.
 */
export const FROZEN_LEGACY_CRM_WRITE_PATHS = [
  "backend/services/crm_service.py",
  "backend/services/contacts.py",
  "backend/services/lead_scoring_service.py",
  "backend/services/gdpr_service.py",
  "backend/os-agents/crm/CrmService.ts",
  "backend/routers/contacts.py",
  "backend/routers/onboarding.py",
  "backend/routers/agent_actions.py",
  "backend/routers/e2e_orchestrator.py",
  "apps/web/src/pages/api/os/crm/contacts.ts",
] as const;

export type LegacyCrmWritePath = (typeof FROZEN_LEGACY_CRM_WRITE_PATHS)[number];

export function isFrozenLegacyCrmWritePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return FROZEN_LEGACY_CRM_WRITE_PATHS.some((p) => normalized.endsWith(p));
}
