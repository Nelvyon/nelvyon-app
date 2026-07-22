/**
 * Unit tests — company DB campaign legal gate (observability; no send activation).
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCampaniaLegalAuditDetails,
  extractAudienceSourceTrace,
  getCompanyDbCampaignLegalStatus,
} from "../companyDbCampaignLegalGate";

describe("companyDbCampaignLegalGate", () => {
  afterEach(() => {
    delete process.env.NELVYON_COMPANY_DB_CAMPAIGNS_LEGAL;
  });

  it("defaults BLOQUEADO_LEGAL", () => {
    const s = getCompanyDbCampaignLegalStatus();
    expect(s.signedEnv).toBe(false);
    expect(s.blockedLabel).toBe("BLOQUEADO_LEGAL");
  });

  it("reads signed env marker without enabling scrape", () => {
    process.env.NELVYON_COMPANY_DB_CAMPAIGNS_LEGAL = "1";
    const s = getCompanyDbCampaignLegalStatus();
    expect(s.signedEnv).toBe(true);
    expect(s.blockedLabel).toBe("LEGAL_ENV_SET");
  });

  it("extracts source_trace from audience filter", () => {
    expect(extractAudienceSourceTrace({ source_trace: "crm_opt_in" })).toBe("crm_opt_in");
    expect(extractAudienceSourceTrace({})).toBeNull();
  });

  it("audit details include legal gate + sourceTrace", () => {
    const d = buildCampaniaLegalAuditDetails({
      totalSent: 3,
      audienceFilter: { source_trace: "partner_licensed" },
    });
    expect(d.totalSent).toBe(3);
    expect(d.legalGate).toBe("BLOQUEADO_LEGAL");
    expect(d.sourceTrace).toBe("partner_licensed");
  });
});
