import { describe, expect, it } from "vitest";

import {
  EMPTY_CLIENT_LIST,
  fallbackWorkspaceList,
  stableWorkspaceIdFromTenant,
} from "@/lib/platformFastApiProxy";

describe("platformFastApiProxy", () => {
  it("stableWorkspaceIdFromTenant is deterministic", () => {
    const id = stableWorkspaceIdFromTenant("a6c069f8-b528-4ecf-8231-09fdd7886106");
    expect(id).toBeGreaterThan(0);
    expect(stableWorkspaceIdFromTenant("a6c069f8-b528-4ecf-8231-09fdd7886106")).toBe(id);
  });

  it("fallbackWorkspaceList returns one workspace row", () => {
    const rows = fallbackWorkspaceList({
      userId: "u-1",
      tenantId: "tenant-1",
      plan: "starter",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Mi Workspace");
    expect(rows[0]?.role).toBe("member");
  });

  it("EMPTY_CLIENT_LIST is a valid empty payload", () => {
    expect(EMPTY_CLIENT_LIST.items).toEqual([]);
    expect(EMPTY_CLIENT_LIST.total).toBe(0);
  });
});
