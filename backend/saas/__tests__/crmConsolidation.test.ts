import { describe, expect, it } from "vitest";

import {
  FROZEN_LEGACY_CRM_WRITE_PATHS,
  LEGACY_CONTACT_STORES,
  SAAS_CRM_SOURCE_OF_TRUTH,
  isFrozenLegacyCrmWritePath,
} from "../crmConsolidation";

describe("crmConsolidation", () => {
  it("declara saas_contacts como fuente oficial", () => {
    expect(SAAS_CRM_SOURCE_OF_TRUTH.table).toBe("saas_contacts");
    expect(SAAS_CRM_SOURCE_OF_TRUTH.service).toBe("SaasCrmService");
  });

  it("lista tres almacenes legacy sin borrar tablas", () => {
    expect(Object.keys(LEGACY_CONTACT_STORES)).toHaveLength(3);
    expect(LEGACY_CONTACT_STORES.contacts.status).toBe("legacy");
  });

  it("congela rutas de escritura legacy conocidas", () => {
    expect(FROZEN_LEGACY_CRM_WRITE_PATHS.length).toBeGreaterThanOrEqual(8);
    expect(isFrozenLegacyCrmWritePath("backend/services/crm_service.py")).toBe(true);
    expect(isFrozenLegacyCrmWritePath("backend/saas/SaasCrmService.ts")).toBe(false);
  });
});
