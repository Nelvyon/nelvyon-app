import { SAAS_CRM_SOURCE_OF_TRUTH } from "./crmConsolidation";

const WARNED = new Set<string>();

/**
 * Fase 1B — aviso en runtime para escrituras CRM legacy.
 * Nuevas features deben usar SaasCrmService / saas_contacts.
 */
export function warnLegacyCrmWrite(caller: string, table: "contacts" | "crm_contacts"): void {
  const key = `${caller}:${table}`;
  if (WARNED.has(key)) return;
  WARNED.add(key);
  const msg =
    `[NELVYON CRM LEGACY] ${caller} escribe en "${table}". ` +
    `Use ${SAAS_CRM_SOURCE_OF_TRUTH.service} (${SAAS_CRM_SOURCE_OF_TRUTH.table}) para desarrollo nuevo. ` +
    `Ver docs/PHASE_1B_CRM_ETL.md`;
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
    console.warn(msg);
  }
}

export function resetLegacyCrmWriteWarningsForTests(): void {
  WARNED.clear();
}
