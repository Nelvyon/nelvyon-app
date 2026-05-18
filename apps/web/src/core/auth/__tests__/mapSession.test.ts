import { describe, expect, it } from "vitest";

import type { AuthMeResponse } from "@/core/auth/mapSession";
import { jwtPlatformRoleToUiRole, resolveUiRole, workspaceRoleToUiRole } from "@/core/auth/mapSession";
import type { WorkspaceRow } from "@/features/workspace/types";

describe("workspaceRoleToUiRole", () => {
  it("maps owner to admin", () => {
    expect(workspaceRoleToUiRole("owner")).toBe("admin");
  });
  it("maps operator to operator", () => {
    expect(workspaceRoleToUiRole("operator")).toBe("operator");
  });
});

describe("jwtPlatformRoleToUiRole", () => {
  it("maps super_admin", () => {
    expect(jwtPlatformRoleToUiRole("super_admin")).toBe("super_admin");
  });
  it("maps unknown platform user to member", () => {
    expect(jwtPlatformRoleToUiRole("user")).toBe("member");
  });
});

describe("resolveUiRole", () => {
  it("prefers workspace membership over JWT user", () => {
    const me: AuthMeResponse = { id: "1", email: "a@b.c", role: "user" };
    const ws: WorkspaceRow = {
      id: 9,
      name: "W",
      role: "operator",
    };
    expect(resolveUiRole(me, ws)).toBe("operator");
  });
});
