import { describe, expect, it, vi } from "vitest";
import { SaasSecurityEnterpriseService } from "../SaasSecurityEnterpriseService";

describe("SaasSecurityEnterpriseService", () => {
  it("matches CIDR allowlist", () => {
    const svc = new SaasSecurityEnterpriseService();
    const cfg = { enabled: true, cidrs: ["203.0.113.0/24"] };
    expect(() => svc.assertIpAllowed(cfg, "203.0.113.50")).not.toThrow();
    expect(() => svc.assertIpAllowed(cfg, "198.51.100.1")).toThrow();
  });

  it("skips IP check when disabled", () => {
    const svc = new SaasSecurityEnterpriseService();
    expect(() => svc.assertIpAllowed({ enabled: false, cidrs: [] }, "1.2.3.4")).not.toThrow();
  });

  it("lists custom roles from db", async () => {
    const db = {
      query: vi.fn().mockResolvedValue([{ id: "r1", name: "Sales", permissions: ["contacts.read"] }]),
    };
    const svc = new SaasSecurityEnterpriseService({ db });
    const roles = await svc.listCustomRoles("tenant-1");
    expect(roles[0]?.name).toBe("Sales");
  });
});

describe("parseSamlResponse", () => {
  it("extracts NameID from minimal assertion", async () => {
    const { parseSamlResponse } = await import("../../../apps/web/src/lib/sso/samlParse");
    const xml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
      <Assertion xmlns="urn:oasis:names:tc:SAML:2.0:assertion">
        <Subject><NameID>user@corp.com</NameID></Subject>
      </Assertion>
    </samlp:Response>`;
    const b64 = Buffer.from(xml).toString("base64");
    const result = await parseSamlResponse(b64);
    expect(result.nameId).toBe("user@corp.com");
    expect(result.email).toBe("user@corp.com");
  });
});
