import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertStagingSharedMemoryMcpHarnessIntegrity,
  buildStagingSharedMemoryMcpEvidenceMarkdown,
  checkSmPermission,
  isMcpProductiveEnabled,
  isMcpStagingSyntheticAuthorized,
  isSharedMemoryStagingSyntheticAuthorized,
  listSmMcpAuditLog,
  minPermissionsForRole,
  readSyntheticMemory,
  resetStagingSharedMemoryMcpHarnessForTests,
  runStagingSharedMemoryMcpDrill,
} from "../StagingSharedMemoryMcpHarness";

describe("Staging Shared Memory + MCP synthetic harness (ADR-055) — fail-closed by default", () => {
  beforeEach(() => {
    resetStagingSharedMemoryMcpHarnessForTests();
  });

  afterEach(() => {
    delete process.env.NELVYON_SHARED_MEMORY_STAGING;
    delete process.env.NELVYON_MCP_STAGING_SYNTHETIC;
    delete process.env.NELVYON_MCP_PRODUCTIVE_ENABLED;
  });

  it("is disabled by default (both flags OFF)", () => {
    expect(isSharedMemoryStagingSyntheticAuthorized()).toBe(false);
    expect(isMcpStagingSyntheticAuthorized()).toBe(false);
    expect(isMcpProductiveEnabled()).toBe(false);
  });

  it("runStagingSharedMemoryMcpDrill returns disabled mode with blockers when flags are OFF", async () => {
    const result = await runStagingSharedMemoryMcpDrill();
    expect(result.ok).toBe(false);
    expect(result.mode).toBe("disabled");
    expect(result.blockers).toEqual(
      expect.arrayContaining(["shared_memory_staging_off", "mcp_staging_synthetic_off"]),
    );
  });

  it("productive MCP requires BOTH the productive flag AND staging synthetic mode", () => {
    process.env.NELVYON_MCP_PRODUCTIVE_ENABLED = "1";
    expect(isMcpProductiveEnabled()).toBe(false);
    process.env.NELVYON_MCP_STAGING_SYNTHETIC = "1";
    expect(isMcpProductiveEnabled()).toBe(true);
  });

  it("RLS-style isolation: tenant A can read its own data but never tenant B's", () => {
    const own = readSyntheticMemory({
      requestingTenantId: "synthetic-tenant-a",
      targetTenantId: "synthetic-tenant-a",
    });
    expect(own.allowed).toBe(true);
    expect(own.records.length).toBeGreaterThan(0);
    expect(own.records.every((r) => r.tenantId === "synthetic-tenant-a")).toBe(true);

    const cross = readSyntheticMemory({
      requestingTenantId: "synthetic-tenant-a",
      targetTenantId: "synthetic-tenant-b",
    });
    expect(cross.allowed).toBe(false);
    expect(cross.records).toEqual([]);
    expect(cross.reason).toBe("rls_isolation_denied_cross_tenant");
  });

  it("deny-by-default: reader can read but never write; every check is audited", () => {
    const read = checkSmPermission({ role: "reader", action: "read", actorTenantId: "synthetic-tenant-a" });
    const write = checkSmPermission({ role: "reader", action: "write", actorTenantId: "synthetic-tenant-a" });
    expect(read.allowed).toBe(true);
    expect(write.allowed).toBe(false);
    expect(write.reason).toBe("deny_by_default_not_in_role");
    expect(listSmMcpAuditLog().length).toBeGreaterThanOrEqual(2);
  });

  it("minimal permission sets scale with role, admin strictly broader than reader", () => {
    expect(minPermissionsForRole("reader")).toEqual(["read"]);
    expect(minPermissionsForRole("admin").length).toBeGreaterThan(minPermissionsForRole("reader").length);
  });

  it("runs a full synthetic drill and passes when both staging flags are ON", async () => {
    process.env.NELVYON_SHARED_MEMORY_STAGING = "1";
    process.env.NELVYON_MCP_STAGING_SYNTHETIC = "1";
    const result = await runStagingSharedMemoryMcpDrill();
    expect(result.ok).toBe(true);
    expect(result.mode).toBe("synthetic");
    expect(result.tenantIsolationOk).toBe(true);
    expect(result.denyByDefaultOk).toBe(true);
    expect(result.minPermissionsOk).toBe(true);
    expect(result.mcpProductiveEnabled).toBe(false);
    expect(result.openClawHook.ran).toBe(false);
    expect(result.rollbackFlags.length).toBeGreaterThan(0);

    const md = buildStagingSharedMemoryMcpEvidenceMarkdown(result);
    expect(md).toContain("Shared Memory + MCP staging synthetic drill");
    expect(md).toContain("tenantIsolationOk: true");
  });

  it("passes its own integrity assertion", () => {
    expect(assertStagingSharedMemoryMcpHarnessIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
