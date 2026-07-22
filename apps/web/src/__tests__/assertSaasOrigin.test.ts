/**
 * Unit tests — SaaS cookie CSRF Origin allowlist.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  assertSaasCookieMutationOrigin,
  originAllowed,
  isMutatingMethod,
} from "@/lib/security/assertSaasOrigin";

describe("assertSaasOrigin", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.nelvyon.com";
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("detects mutating methods", () => {
    expect(isMutatingMethod("POST")).toBe(true);
    expect(isMutatingMethod("GET")).toBe(false);
  });

  it("allows matching Origin", () => {
    expect(originAllowed("https://app.nelvyon.com")).toBe(true);
    expect(originAllowed("https://evil.example")).toBe(false);
  });

  it("rejects cookie POST without Origin/Referer", () => {
    expect(
      assertSaasCookieMutationOrigin({
        method: "POST",
        pathname: "/api/saas/contacts",
        origin: null,
        referer: null,
        hasAuthCookie: true,
        hasAuthorizationHeader: false,
      }),
    ).toBe("csrf_origin_required");
  });

  it("rejects mismatched Origin", () => {
    expect(
      assertSaasCookieMutationOrigin({
        method: "DELETE",
        pathname: "/api/saas/team",
        origin: "https://evil.example",
        referer: null,
        hasAuthCookie: true,
        hasAuthorizationHeader: false,
      }),
    ).toBe("csrf_origin_mismatch");
  });

  it("allows legitimate Origin", () => {
    expect(
      assertSaasCookieMutationOrigin({
        method: "POST",
        pathname: "/api/saas/contacts",
        origin: "https://app.nelvyon.com",
        referer: null,
        hasAuthCookie: true,
        hasAuthorizationHeader: false,
      }),
    ).toBeNull();
  });

  it("allows production apex Origin even if env points at app host", () => {
    expect(originAllowed("https://nelvyon.com")).toBe(true);
    expect(
      assertSaasCookieMutationOrigin({
        method: "POST",
        pathname: "/api/saas/team",
        origin: "https://nelvyon.com",
        referer: null,
        hasAuthCookie: true,
        hasAuthorizationHeader: false,
      }),
    ).toBeNull();
  });

  it("skips CSRF when Authorization header present", () => {
    expect(
      assertSaasCookieMutationOrigin({
        method: "POST",
        pathname: "/api/saas/contacts",
        origin: null,
        referer: null,
        hasAuthCookie: true,
        hasAuthorizationHeader: true,
      }),
    ).toBeNull();
  });

  it("skips GET", () => {
    expect(
      assertSaasCookieMutationOrigin({
        method: "GET",
        pathname: "/api/saas/contacts",
        origin: null,
        referer: null,
        hasAuthCookie: true,
        hasAuthorizationHeader: false,
      }),
    ).toBeNull();
  });

  it("rejects mismatched Origin on /api/os", () => {
    expect(
      assertSaasCookieMutationOrigin({
        method: "POST",
        pathname: "/api/os/execute",
        origin: "https://evil.example",
        referer: null,
        hasAuthCookie: true,
        hasAuthorizationHeader: false,
      }),
    ).toBe("csrf_origin_mismatch");
  });

  it("allows legitimate Origin on /api/os", () => {
    expect(
      assertSaasCookieMutationOrigin({
        method: "POST",
        pathname: "/api/os/packs/local-business-growth/kickoff",
        origin: "https://app.nelvyon.com",
        referer: null,
        hasAuthCookie: true,
        hasAuthorizationHeader: false,
      }),
    ).toBeNull();
  });
});
