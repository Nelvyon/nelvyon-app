import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  IntegrationsMarketplaceError,
  IntegrationsMarketplaceV1,
  NELVYON_INTERNAL_PING_MANIFEST,
  assertIntegrationsMarketplaceIntegrity,
  assertValidManifest,
  getIntegrationsMarketplace,
  resetIntegrationsMarketplaceForTests,
  type IntegrationManifest,
} from "../IntegrationsMarketplaceV1";

describe("IntegrationsMarketplaceV1 — manifest validation", () => {
  it("accepts the built-in ping manifest", () => {
    expect(assertValidManifest(NELVYON_INTERNAL_PING_MANIFEST)).toEqual({ ok: true, violations: [] });
  });

  it("rejects a manifest with a non-internal publisher", () => {
    const bad: IntegrationManifest = {
      ...NELVYON_INTERNAL_PING_MANIFEST,
      id: "acme.crm.sync",
      publisher: "external_third_party" as IntegrationManifest["publisher"],
    };
    const result = assertValidManifest(bad);
    expect(result.ok).toBe(false);
    expect(result.violations).toContain("publisher_not_allowed_in_v1");
  });

  it("rejects invalid id format, semver, empty scopes/permissions, bad healthcheck path", () => {
    const bad: IntegrationManifest = {
      id: "NotValidId",
      version: "v1",
      title: "",
      publisher: "nelvyon_internal",
      scopes: [],
      permissions: [],
      healthcheckPath: "health",
    };
    const result = assertValidManifest(bad);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        "invalid_id_format",
        "invalid_semver_version",
        "missing_title",
        "scopes_must_be_non_empty",
        "permissions_must_be_non_empty",
        "healthcheck_path_must_start_with_slash",
      ]),
    );
  });
});

describe("IntegrationsMarketplaceV1 — catalog + built-in ping integration", () => {
  let marketplace: IntegrationsMarketplaceV1;

  beforeEach(() => {
    marketplace = new IntegrationsMarketplaceV1();
  });

  it("registers nelvyon.internal.ping by default", () => {
    const catalog = marketplace.listCatalog();
    expect(catalog.some((m) => m.id === "nelvyon.internal.ping" && m.version === "1.0.0")).toBe(true);
  });

  it("rejects registering a manifest from a non-internal publisher", () => {
    expect(() =>
      marketplace.registerIntegration(
        {
          id: "acme.external.crm",
          version: "1.0.0",
          title: "Acme CRM",
          publisher: "external_third_party" as IntegrationManifest["publisher"],
          scopes: ["crm.read"],
          permissions: ["read"],
          healthcheckPath: "/health",
        },
        { healthcheck: () => ({ ok: true, detail: "" }) },
      ),
    ).toThrow(IntegrationsMarketplaceError);
  });

  it("installs ping for a tenant and healthchecks OK", () => {
    const install = marketplace.install({
      tenantId: "tenant-a",
      integrationId: "nelvyon.internal.ping",
      version: "1.0.0",
    });
    expect(install.status).toBe("installed");
    expect(install.grantedScopes).toEqual(["internal.read"]);

    const health = marketplace.healthcheck({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping" });
    expect(health).toEqual({ ok: true, detail: "pong" });
  });

  it("fails to install an unknown version", () => {
    expect(() =>
      marketplace.install({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping", version: "9.9.9" }),
    ).toThrow(/NOT_FOUND/);
  });

  it("supports versioning: registering v1.1.0 and upgrading an install", () => {
    marketplace.registerIntegration(
      { ...NELVYON_INTERNAL_PING_MANIFEST, version: "1.1.0", scopes: ["internal.read", "internal.status"] },
      { healthcheck: () => ({ ok: true, detail: "pong-v1.1.0" }) },
    );
    marketplace.install({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping", version: "1.0.0" });
    const upgraded = marketplace.upgrade({
      tenantId: "tenant-a",
      integrationId: "nelvyon.internal.ping",
      toVersion: "1.1.0",
    });
    expect(upgraded.version).toBe("1.1.0");
    expect(upgraded.grantedScopes).toEqual(["internal.read", "internal.status"]);
    const health = marketplace.healthcheck({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping" });
    expect(health.detail).toBe("pong-v1.1.0");
    expect(marketplace.listVersions("nelvyon.internal.ping")).toEqual(["1.0.0", "1.1.0"]);
  });

  it("revoke blocks healthcheck; uninstall removes the install entirely", () => {
    marketplace.install({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping", version: "1.0.0" });
    const revoked = marketplace.revoke({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping" });
    expect(revoked.status).toBe("revoked");
    expect(() =>
      marketplace.healthcheck({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping" }),
    ).toThrow(/INVALID_STATE/);

    marketplace.uninstall({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping" });
    expect(marketplace.getInstall("tenant-a", "nelvyon.internal.ping")).toBeNull();
  });

  it("tenant isolation: tenant A's install is invisible and untouchable from tenant B", () => {
    marketplace.install({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping", version: "1.0.0" });
    expect(marketplace.listInstalled("tenant-b")).toEqual([]);
    expect(() =>
      marketplace.healthcheck({ tenantId: "tenant-b", integrationId: "nelvyon.internal.ping" }),
    ).toThrow(/NOT_INSTALLED/);
  });

  it("audit log records manifest registration, install, and healthcheck events", () => {
    marketplace.install({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping", version: "1.0.0" });
    marketplace.healthcheck({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping" });
    const log = marketplace.listAuditLog("tenant-a");
    expect(log.map((e) => e.action)).toEqual(expect.arrayContaining(["installed", "healthcheck_ok"]));
    const globalLog = marketplace.listAuditLog();
    expect(globalLog.some((e) => e.action === "manifest_registered")).toBe(true);
  });
});

describe("IntegrationsMarketplaceV1 — shared singleton + integrity", () => {
  afterEach(() => {
    resetIntegrationsMarketplaceForTests();
  });

  it("shared instance persists installs and can be reset for tests", () => {
    const a = getIntegrationsMarketplace();
    a.install({ tenantId: "tenant-a", integrationId: "nelvyon.internal.ping", version: "1.0.0" });
    const b = getIntegrationsMarketplace();
    expect(b.getInstall("tenant-a", "nelvyon.internal.ping")).not.toBeNull();

    resetIntegrationsMarketplaceForTests();
    const c = getIntegrationsMarketplace();
    expect(c.getInstall("tenant-a", "nelvyon.internal.ping")).toBeNull();
  });

  it("passes full integrity assertion", () => {
    expect(assertIntegrationsMarketplaceIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
