import { describe, expect, it } from "vitest";
import {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS_WITHOUT_CSP,
} from "@/lib/security/headers";
import { applySecurityHeaders } from "@/lib/security/securityHeaders";

describe("security headers SSOT", () => {
  it("CONTENT_SECURITY_POLICY includes formspree.io", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("formspree.io");
  });

  it("CONTENT_SECURITY_POLICY allows Google Maps embeds (contact)", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("https://www.google.com");
    expect(CONTENT_SECURITY_POLICY).toContain("https://maps.google.com");
  });

  it("SECURITY_HEADERS_WITHOUT_CSP has X-Frame-Options SAMEORIGIN", () => {
    const xfo = SECURITY_HEADERS_WITHOUT_CSP.find((h) => h.key === "X-Frame-Options");
    expect(xfo?.value).toBe("SAMEORIGIN");
  });

  it("applySecurityHeaders is exported and callable", () => {
    expect(typeof applySecurityHeaders).toBe("function");
  });
});
