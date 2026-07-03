import { describe, expect, it } from "vitest";

import {
  SaasAutonomyService,
  resetSaasAutonomyServiceForTests,
} from "../SaasAutonomyService";
import {
  signPortalApprovalToken,
  verifyPortalApprovalToken,
} from "../PortalApprovalTokenService";
import { MCP_TOOLS } from "../NelvyonMcpService";
import { SaasApprovalCardsService } from "../SaasApprovalCardsService";

describe("Elite roadmap S58", () => {
  it("autonomy gates block execute in draft mode", () => {
    resetSaasAutonomyServiceForTests();
    const svc = new SaasAutonomyService({ query: async () => [] } as never);
    const gate = svc.gateOutbound("draft", "launch");
    expect(gate.allowed).toBe(false);
    expect(svc.gateAgentAuto("execute").allowed).toBe(true);
  });

  it("portal approval token round-trips", () => {
    process.env.JWT_SECRET = "test-secret-at-least-32-characters-long";
    const token = signPortalApprovalToken({
      did: "00000000-0000-4000-8000-000000000001",
      wid: 1,
      cid: "00000000-0000-4000-8000-000000000002",
      act: "approve",
    });
    const v = verifyPortalApprovalToken(token);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.payload.act).toBe("approve");
  });

  it("rejects tampered portal token", () => {
    process.env.JWT_SECRET = "test-secret-at-least-32-characters-long";
    const token = signPortalApprovalToken({
      did: "00000000-0000-4000-8000-000000000001",
      wid: 1,
      cid: "00000000-0000-4000-8000-000000000002",
      act: "approve",
    });
    const bad = token.slice(0, -4) + "xxxx";
    expect(verifyPortalApprovalToken(bad).ok).toBe(false);
  });

  it("MCP tool registry has 5 tools", () => {
    expect(MCP_TOOLS.length).toBe(5);
    expect(MCP_TOOLS.map((t) => t.name)).toContain("pack_kickoff");
  });

  it("blocks non-https teams webhooks (SSRF guard)", () => {
    expect(SaasApprovalCardsService.isSafeWebhookUrl("https://outlook.office.com/webhook/abc")).toBe(true);
    expect(SaasApprovalCardsService.isSafeWebhookUrl("http://evil.com/hook")).toBe(false);
    expect(SaasApprovalCardsService.isSafeWebhookUrl("ftp://x.com")).toBe(false);
  });
});
