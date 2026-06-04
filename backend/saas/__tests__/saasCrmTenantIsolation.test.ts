import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_SERVICE_PATH = join(__dirname, "..", "SaasCrmService.ts");

describe("SaasCrmService tenant isolation (static audit)", () => {
  const src = readFileSync(CRM_SERVICE_PATH, "utf8");

  const mustFilterTenant = [
    { label: "getContacts list", pattern: /async getContacts[\s\S]*?WHERE \$\{clauses\.join/ },
    { label: "getContact", pattern: /async getContact[\s\S]*?WHERE tenant_id = \$1 AND id = \$2/ },
    { label: "updateContact", pattern: /async updateContact[\s\S]*?WHERE tenant_id = \$1 AND id = \$2/ },
    { label: "deleteContact", pattern: /DELETE FROM saas_contacts WHERE tenant_id = \$1 AND id = \$2/ },
    { label: "getPipelineSummary", pattern: /FROM saas_contacts[\s\S]*?WHERE tenant_id = \$1/ },
    { label: "getActivities", pattern: /FROM saas_contact_activities[\s\S]*?WHERE contact_id = \$1 AND tenant_id = \$2/ },
    { label: "createContact insert", pattern: /INSERT INTO saas_contacts[\s\S]*?tenant_id, name/ },
    { label: "addActivity insert", pattern: /INSERT INTO saas_contact_activities[\s\S]*?tenant_id/ },
  ];

  for (const { label, pattern } of mustFilterTenant) {
    it(`${label} incluye tenant_id`, () => {
      expect(src).toMatch(pattern);
    });
  }

  it("no consulta saas_contacts solo por id en updateContact", () => {
    const updateBlock = src.slice(src.indexOf("async updateContact"), src.indexOf("async deleteContact"));
    expect(updateBlock).not.toMatch(/FROM saas_contacts WHERE id = \$1 LIMIT 1/);
  });
});
