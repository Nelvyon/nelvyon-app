import { describe, expect, it } from "vitest";
import { getRateLimitRule } from "@/lib/security/rateLimit";

describe("getRateLimitRule SaaS sensitive surfaces", () => {
  it("matches CRM export/import", () => {
    expect(getRateLimitRule("/api/saas/crm/contacts/export")?.id).toBe("saas-crm-export");
    expect(getRateLimitRule("/api/saas/crm/contacts/import")?.id).toBe("saas-crm-export");
  });

  it("matches GDPR, launch, webhook-in, audit", () => {
    expect(getRateLimitRule("/api/saas/compliance/gdpr")?.id).toBe("saas-gdpr");
    expect(getRateLimitRule("/api/saas/campanias/abc/launch")?.id).toBe("saas-campania-launch");
    expect(getRateLimitRule("/api/saas/workflows/webhook-in")?.id).toBe("saas-webhook-in");
    expect(getRateLimitRule("/api/saas/audit/unified")?.id).toBe("saas-audit");
  });

  it("does not rate-limit ordinary CRM list", () => {
    expect(getRateLimitRule("/api/saas/crm/contacts")).toBeNull();
  });
});
