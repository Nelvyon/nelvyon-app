/**
 * Integrations marketplace v1 — internal only (ADR-056 block 17).
 *
 * A minimal, in-memory manifest catalog + per-tenant install lifecycle
 * (install/healthcheck/upgrade/revoke/uninstall) with an audit log. V1
 * intentionally supports ONLY internal, first-party integrations —
 * `assertValidManifest` hard-rejects any manifest whose `publisher` is not
 * `"nelvyon_internal"`, so there is no code path to publish or install a real
 * third-party integration in this version.
 *
 * Ships exactly one built-in integration, `nelvyon.internal.ping`, which
 * installs and healthchecks successfully with zero external dependencies —
 * used as the reference implementation and as a synthetic-only smoke check.
 *
 * See `docs/ops/INTEGRATIONS_MARKETPLACE_V1.md` for scope and what "v2" (real
 * third-party publishing) would require before it could ever be built.
 */

import { randomUUID } from "node:crypto";

const MANIFEST_ID_RE = /^[a-z0-9]+(\.[a-z0-9_-]+)+$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

export type IntegrationPublisher = "nelvyon_internal";

export type IntegrationManifest = {
  id: string;
  version: string;
  title: string;
  /** V1 only allows the internal, first-party publisher — no external publish path exists. */
  publisher: IntegrationPublisher;
  scopes: readonly string[];
  permissions: readonly string[];
  healthcheckPath: string;
};

export type IntegrationHealthcheckResult = { ok: boolean; detail: string };

export type IntegrationHandlers = {
  install?: (ctx: { tenantId: string }) => void;
  uninstall?: (ctx: { tenantId: string }) => void;
  healthcheck: (ctx: { tenantId: string }) => IntegrationHealthcheckResult;
};

export type IntegrationInstallStatus = "installed" | "revoked" | "uninstalled";

export type IntegrationInstallRecord = {
  id: string;
  tenantId: string;
  integrationId: string;
  version: string;
  status: IntegrationInstallStatus;
  grantedScopes: string[];
  grantedPermissions: string[];
  installedAt: string;
  updatedAt: string;
};

export type IntegrationsMarketplaceAuditAction =
  | "manifest_registered"
  | "installed"
  | "upgraded"
  | "revoked"
  | "uninstalled"
  | "healthcheck_ok"
  | "healthcheck_failed"
  | "manifest_rejected";

export type IntegrationsMarketplaceAuditEntry = {
  id: string;
  tenantId: string | null;
  integrationId: string | null;
  action: IntegrationsMarketplaceAuditAction;
  at: string;
  detail: string;
};

export class IntegrationsMarketplaceError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "IntegrationsMarketplaceError";
    this.code = code;
  }
}

export function assertValidManifest(manifest: IntegrationManifest): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (!MANIFEST_ID_RE.test(manifest.id)) violations.push("invalid_id_format");
  if (!SEMVER_RE.test(manifest.version)) violations.push("invalid_semver_version");
  if (!manifest.title.trim()) violations.push("missing_title");
  if (manifest.publisher !== "nelvyon_internal") violations.push("publisher_not_allowed_in_v1");
  if (manifest.scopes.length === 0) violations.push("scopes_must_be_non_empty");
  if (manifest.permissions.length === 0) violations.push("permissions_must_be_non_empty");
  if (!manifest.healthcheckPath.startsWith("/")) violations.push("healthcheck_path_must_start_with_slash");
  return { ok: violations.length === 0, violations };
}

export const NELVYON_INTERNAL_PING_MANIFEST: IntegrationManifest = {
  id: "nelvyon.internal.ping",
  version: "1.0.0",
  title: "Nelvyon Internal Ping",
  publisher: "nelvyon_internal",
  scopes: ["internal.read"],
  permissions: ["read_status"],
  healthcheckPath: "/internal/ping/health",
};

const NELVYON_INTERNAL_PING_HANDLERS: IntegrationHandlers = {
  healthcheck: () => ({ ok: true, detail: "pong" }),
};

function manifestKey(id: string, version: string): string {
  return `${id}@${version}`;
}

type CatalogEntry = { manifest: IntegrationManifest; handlers: IntegrationHandlers };

/**
 * In-memory marketplace: a versioned manifest catalog plus per-tenant installs.
 * All state lives on the instance, so tests can create isolated marketplaces
 * without touching a database.
 */
export class IntegrationsMarketplaceV1 {
  private readonly catalog = new Map<string, CatalogEntry>();
  private readonly installsByTenant = new Map<string, Map<string, IntegrationInstallRecord>>();
  private readonly auditLog: IntegrationsMarketplaceAuditEntry[] = [];

  constructor() {
    this.registerIntegration(NELVYON_INTERNAL_PING_MANIFEST, NELVYON_INTERNAL_PING_HANDLERS);
  }

  private audit(entry: Omit<IntegrationsMarketplaceAuditEntry, "id" | "at">): void {
    this.auditLog.push({ ...entry, id: randomUUID(), at: new Date().toISOString() });
  }

  listAuditLog(tenantId?: string): readonly IntegrationsMarketplaceAuditEntry[] {
    return tenantId ? this.auditLog.filter((e) => e.tenantId === tenantId) : this.auditLog;
  }

  registerIntegration(manifest: IntegrationManifest, handlers: IntegrationHandlers): void {
    const check = assertValidManifest(manifest);
    if (!check.ok) {
      this.audit({
        tenantId: null,
        integrationId: manifest.id,
        action: "manifest_rejected",
        detail: check.violations.join(","),
      });
      throw new IntegrationsMarketplaceError(
        "INVALID_MANIFEST",
        `manifest ${manifest.id}@${manifest.version} invalid: ${check.violations.join(", ")}`,
      );
    }
    this.catalog.set(manifestKey(manifest.id, manifest.version), { manifest, handlers });
    this.audit({
      tenantId: null,
      integrationId: manifest.id,
      action: "manifest_registered",
      detail: `version=${manifest.version}`,
    });
  }

  listCatalog(): IntegrationManifest[] {
    return [...this.catalog.values()].map((e) => e.manifest);
  }

  listVersions(integrationId: string): string[] {
    return [...this.catalog.values()]
      .filter((e) => e.manifest.id === integrationId)
      .map((e) => e.manifest.version)
      .sort();
  }

  getManifest(integrationId: string, version: string): IntegrationManifest | null {
    return this.catalog.get(manifestKey(integrationId, version))?.manifest ?? null;
  }

  private tenantInstalls(tenantId: string): Map<string, IntegrationInstallRecord> {
    if (!tenantId) throw new IntegrationsMarketplaceError("TENANT_REQUIRED", "tenantId is required");
    let map = this.installsByTenant.get(tenantId);
    if (!map) {
      map = new Map();
      this.installsByTenant.set(tenantId, map);
    }
    return map;
  }

  install(input: { tenantId: string; integrationId: string; version: string }): IntegrationInstallRecord {
    const entry = this.catalog.get(manifestKey(input.integrationId, input.version));
    if (!entry) {
      throw new IntegrationsMarketplaceError(
        "NOT_FOUND",
        `manifest not found: ${input.integrationId}@${input.version}`,
      );
    }
    const installs = this.tenantInstalls(input.tenantId);
    const now = new Date().toISOString();
    const record: IntegrationInstallRecord = {
      id: randomUUID(),
      tenantId: input.tenantId,
      integrationId: input.integrationId,
      version: input.version,
      status: "installed",
      grantedScopes: [...entry.manifest.scopes],
      grantedPermissions: [...entry.manifest.permissions],
      installedAt: now,
      updatedAt: now,
    };
    installs.set(input.integrationId, record);
    entry.handlers.install?.({ tenantId: input.tenantId });
    this.audit({
      tenantId: input.tenantId,
      integrationId: input.integrationId,
      action: "installed",
      detail: `version=${input.version}`,
    });
    return record;
  }

  private getOwnedInstall(tenantId: string, integrationId: string): IntegrationInstallRecord {
    const record = this.tenantInstalls(tenantId).get(integrationId);
    if (!record) throw new IntegrationsMarketplaceError("NOT_INSTALLED", `not installed: ${integrationId}`);
    if (record.tenantId !== tenantId) {
      throw new IntegrationsMarketplaceError("TENANT_MISMATCH", "cross-tenant access to install denied");
    }
    return record;
  }

  listInstalled(tenantId: string): IntegrationInstallRecord[] {
    return [...this.tenantInstalls(tenantId).values()];
  }

  getInstall(tenantId: string, integrationId: string): IntegrationInstallRecord | null {
    try {
      return this.getOwnedInstall(tenantId, integrationId);
    } catch {
      return null;
    }
  }

  upgrade(input: { tenantId: string; integrationId: string; toVersion: string }): IntegrationInstallRecord {
    const record = this.getOwnedInstall(input.tenantId, input.integrationId);
    if (record.status !== "installed") {
      throw new IntegrationsMarketplaceError("INVALID_STATE", `cannot upgrade a ${record.status} install`);
    }
    const target = this.catalog.get(manifestKey(input.integrationId, input.toVersion));
    if (!target) {
      throw new IntegrationsMarketplaceError(
        "NOT_FOUND",
        `target version not found: ${input.integrationId}@${input.toVersion}`,
      );
    }
    record.version = input.toVersion;
    record.grantedScopes = [...target.manifest.scopes];
    record.grantedPermissions = [...target.manifest.permissions];
    record.updatedAt = new Date().toISOString();
    this.audit({
      tenantId: input.tenantId,
      integrationId: input.integrationId,
      action: "upgraded",
      detail: `to_version=${input.toVersion}`,
    });
    return record;
  }

  revoke(input: { tenantId: string; integrationId: string }): IntegrationInstallRecord {
    const record = this.getOwnedInstall(input.tenantId, input.integrationId);
    record.status = "revoked";
    record.updatedAt = new Date().toISOString();
    this.audit({ tenantId: input.tenantId, integrationId: input.integrationId, action: "revoked", detail: "" });
    return record;
  }

  uninstall(input: { tenantId: string; integrationId: string }): void {
    const record = this.getOwnedInstall(input.tenantId, input.integrationId);
    const entry = this.catalog.get(manifestKey(record.integrationId, record.version));
    entry?.handlers.uninstall?.({ tenantId: input.tenantId });
    this.tenantInstalls(input.tenantId).delete(input.integrationId);
    this.audit({ tenantId: input.tenantId, integrationId: input.integrationId, action: "uninstalled", detail: "" });
  }

  healthcheck(input: { tenantId: string; integrationId: string }): IntegrationHealthcheckResult {
    const record = this.getOwnedInstall(input.tenantId, input.integrationId);
    if (record.status !== "installed") {
      throw new IntegrationsMarketplaceError("INVALID_STATE", `cannot healthcheck a ${record.status} install`);
    }
    const entry = this.catalog.get(manifestKey(record.integrationId, record.version));
    if (!entry) throw new IntegrationsMarketplaceError("NOT_FOUND", "manifest missing for installed version");
    const result = entry.handlers.healthcheck({ tenantId: input.tenantId });
    this.audit({
      tenantId: input.tenantId,
      integrationId: input.integrationId,
      action: result.ok ? "healthcheck_ok" : "healthcheck_failed",
      detail: result.detail,
    });
    return result;
  }
}

let sharedInstance: IntegrationsMarketplaceV1 | undefined;

export function getIntegrationsMarketplace(): IntegrationsMarketplaceV1 {
  if (!sharedInstance) sharedInstance = new IntegrationsMarketplaceV1();
  return sharedInstance;
}

export function resetIntegrationsMarketplaceForTests(): void {
  sharedInstance = new IntegrationsMarketplaceV1();
}

export function assertIntegrationsMarketplaceIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  const marketplace = new IntegrationsMarketplaceV1();
  if (!marketplace.listCatalog().some((m) => m.id === "nelvyon.internal.ping")) {
    violations.push("ping_integration_must_be_registered_by_default");
  }

  const install = marketplace.install({
    tenantId: "integrity-tenant-a",
    integrationId: "nelvyon.internal.ping",
    version: "1.0.0",
  });
  if (install.status !== "installed") violations.push("ping_install_must_succeed");

  const health = marketplace.healthcheck({ tenantId: "integrity-tenant-a", integrationId: "nelvyon.internal.ping" });
  if (!health.ok) violations.push("ping_healthcheck_must_be_ok");

  const externalManifest: IntegrationManifest = {
    id: "acme.external.crm",
    version: "1.0.0",
    title: "Acme external CRM",
    publisher: "external_third_party" as IntegrationPublisher,
    scopes: ["crm.read"],
    permissions: ["read"],
    healthcheckPath: "/health",
  };
  try {
    marketplace.registerIntegration(externalManifest, { healthcheck: () => ({ ok: true, detail: "" }) });
    violations.push("external_publisher_must_be_rejected");
  } catch (err) {
    if (!(err instanceof IntegrationsMarketplaceError) || err.code !== "INVALID_MANIFEST") {
      violations.push("external_publisher_rejection_wrong_error");
    }
  }

  const otherTenantInstalls = marketplace.listInstalled("integrity-tenant-b");
  if (otherTenantInstalls.length !== 0) violations.push("tenant_isolation_leak");

  return { ok: violations.length === 0, violations };
}
