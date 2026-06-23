import { describe, expect, it } from "vitest";

import { resolveOsCapabilityTemplate } from "../os-service-templates";
import { resolveSaasServiceTemplate } from "../saas-service-templates";
import {
  DUAL_SERVICE_LINKS,
  OS_CAPABILITY_COUNT,
  SAAS_SERVICE_COUNT,
} from "../service-layers";

describe("service-layers saas vs os", () => {
  it("covers full Nelvyon catalog (not legacy 14)", () => {
    expect(SAAS_SERVICE_COUNT).toBeGreaterThanOrEqual(35);
    expect(OS_CAPABILITY_COUNT).toBeGreaterThanOrEqual(30);
  });

  it("resolves SaaS pack service seeds without OS namespace", () => {
    const hit = resolveSaasServiceTemplate({
      saas_service_id: "pack_email_nurture",
      sector: "restaurant",
      kind: "email_sequence",
    });
    expect(hit).toBeTruthy();
    expect(hit!.layer).toBe("both");
    expect(hit!.saas_service_id).toBe("pack_email_nurture");
    expect(hit!.seed.item_name.length).toBeGreaterThan(3);
  });

  it("resolves OS capability seeds without SaaS namespace", () => {
    const hit = resolveOsCapabilityTemplate({
      os_capability_id: "cap_template_factory",
      sector: "saas_startup",
      kind: "landing",
    });
    expect(hit).toBeTruthy();
    expect(hit!.layer).toBe("os");
    expect(hit!.os_capability_id).toBe("cap_template_factory");
  });

  it("marks dual-linked services as both layer", () => {
    const link = DUAL_SERVICE_LINKS.find((l) => l.saas_id === "sku_seo");
    expect(link?.os_id).toBe("cap_seo_premium");
    const saas = resolveSaasServiceTemplate({
      saas_service_id: "sku_seo",
      sector: "dental",
      kind: "seo_page",
    });
    const os = resolveOsCapabilityTemplate({
      os_capability_id: "cap_seo_premium",
      sector: "dental",
      kind: "seo_page",
    });
    expect(saas?.layer).toBe("both");
    expect(os?.layer).toBe("both");
    expect(saas?.seed.item_name).toBe(os?.seed.item_name);
  });

  it("rejects kinds outside SaaS service definition", () => {
    const hit = resolveSaasServiceTemplate({
      saas_service_id: "sku_logo",
      sector: "restaurant",
      kind: "seo_page",
    });
    expect(hit).toBeNull();
  });
});
