import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SERVICE_PATH = join(__dirname, "..", "SaasDealsService.ts");

describe("SaasDealsService tenant isolation (static audit)", () => {
  const src = readFileSync(SERVICE_PATH, "utf8");

  const mustFilterTenant = [
    { label: "listDeals", pattern: /async listDeals[\s\S]*?FROM saas_deals[\s\S]*?tenant_id = \$1/ },
    { label: "getDeal", pattern: /async getDeal[\s\S]*?WHERE tenant_id = \$1 AND id = \$2/ },
    { label: "createDeal insert", pattern: /INSERT INTO saas_deals[\s\S]*?tenant_id, contact_id/ },
    { label: "updateDeal", pattern: /UPDATE saas_deals SET[\s\S]*?WHERE tenant_id = \$1 AND id = \$2/ },
    { label: "deleteDeal", pattern: /DELETE FROM saas_deals WHERE tenant_id = \$1 AND id = \$2/ },
    { label: "getMetrics", pattern: /async getMetrics[\s\S]*?FROM saas_deals[\s\S]*?WHERE tenant_id = \$1/ },
    { label: "getContactDealsContext deals", pattern: /getContactDealsContext[\s\S]*?listDeals\(tenantId/ },
  ];

  for (const { label, pattern } of mustFilterTenant) {
    it(`${label} incluye tenant_id`, () => {
      expect(src).toMatch(pattern);
    });
  }
});
