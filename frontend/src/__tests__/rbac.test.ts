/**
 * RBAC Unit Tests — Tests for the role-based access control system.
 * Covers: role hierarchy, permission inheritance, edge cases.
 */
import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
  isRoleAtLeast,
  getRoleLevel,
  getRoleLabel,
  getRoleColor,
  ALL_ROLES,
  DEFAULT_ROLE,
  type Role,
  type Permission,
} from "@/lib/rbac";

describe("RBAC — Role Hierarchy", () => {
  it("should have 5 defined roles", () => {
    expect(ALL_ROLES).toHaveLength(5);
    expect(ALL_ROLES).toContain("super_admin");
    expect(ALL_ROLES).toContain("admin");
    expect(ALL_ROLES).toContain("manager");
    expect(ALL_ROLES).toContain("user");
    expect(ALL_ROLES).toContain("viewer");
  });

  it("should order roles by privilege (super_admin highest)", () => {
    expect(getRoleLevel("super_admin")).toBeLessThan(getRoleLevel("admin"));
    expect(getRoleLevel("admin")).toBeLessThan(getRoleLevel("manager"));
    expect(getRoleLevel("manager")).toBeLessThan(getRoleLevel("user"));
    expect(getRoleLevel("user")).toBeLessThan(getRoleLevel("viewer"));
  });

  it("should default new users to 'user' role", () => {
    expect(DEFAULT_ROLE).toBe("user");
  });

  it("isRoleAtLeast should work correctly", () => {
    expect(isRoleAtLeast("super_admin", "viewer")).toBe(true);
    expect(isRoleAtLeast("super_admin", "super_admin")).toBe(true);
    expect(isRoleAtLeast("viewer", "admin")).toBe(false);
    expect(isRoleAtLeast("manager", "manager")).toBe(true);
    expect(isRoleAtLeast("user", "manager")).toBe(false);
  });
});

describe("RBAC — Permission Inheritance", () => {
  it("viewer should only have read permissions", () => {
    const perms = getPermissionsForRole("viewer");
    expect(perms.has("clients:read")).toBe(true);
    expect(perms.has("projects:read")).toBe(true);
    expect(perms.has("clients:create")).toBe(false);
    expect(perms.has("clients:delete")).toBe(false);
    expect(perms.has("billing:manage")).toBe(false);
  });

  it("user should inherit all viewer permissions plus create/update", () => {
    const perms = getPermissionsForRole("user");
    // Inherited from viewer
    expect(perms.has("clients:read")).toBe(true);
    expect(perms.has("projects:read")).toBe(true);
    // Own permissions
    expect(perms.has("clients:create")).toBe(true);
    expect(perms.has("clients:update")).toBe(true);
    expect(perms.has("outputs:generate")).toBe(true);
    // Should NOT have
    expect(perms.has("clients:delete")).toBe(false);
    expect(perms.has("billing:manage")).toBe(false);
  });

  it("manager should inherit user + viewer permissions plus delete", () => {
    const perms = getPermissionsForRole("manager");
    expect(perms.has("clients:read")).toBe(true);
    expect(perms.has("clients:create")).toBe(true);
    expect(perms.has("clients:delete")).toBe(true);
    expect(perms.has("billing:read")).toBe(true);
    expect(perms.has("users:invite")).toBe(true);
    // Should NOT have
    expect(perms.has("billing:manage")).toBe(false);
    expect(perms.has("platform:settings")).toBe(false);
  });

  it("admin should inherit all lower permissions plus platform access", () => {
    const perms = getPermissionsForRole("admin");
    expect(perms.has("clients:read")).toBe(true);
    expect(perms.has("clients:delete")).toBe(true);
    expect(perms.has("billing:manage")).toBe(true);
    expect(perms.has("platform:health")).toBe(true);
    expect(perms.has("platform:metrics")).toBe(true);
    expect(perms.has("agents:configure")).toBe(true);
    expect(perms.has("security:manage")).toBe(true);
    // Should NOT have
    expect(perms.has("platform:settings")).toBe(false);
    expect(perms.has("users:delete")).toBe(false);
  });

  it("super_admin should have ALL permissions", () => {
    const perms = getPermissionsForRole("super_admin");
    expect(perms.has("platform:settings")).toBe(true);
    expect(perms.has("users:delete")).toBe(true);
    expect(perms.has("billing:manage")).toBe(true);
    expect(perms.has("clients:read")).toBe(true);
    expect(perms.has("security:manage")).toBe(true);
    // super_admin should have everything
    expect(perms.size).toBeGreaterThan(getPermissionsForRole("admin").size);
  });
});

describe("RBAC — hasPermission", () => {
  it("should return true for valid permissions", () => {
    expect(hasPermission("admin", "billing:manage")).toBe(true);
    expect(hasPermission("user", "clients:create")).toBe(true);
    expect(hasPermission("viewer", "clients:read")).toBe(true);
  });

  it("should return false for unauthorized permissions", () => {
    expect(hasPermission("viewer", "clients:create")).toBe(false);
    expect(hasPermission("user", "billing:manage")).toBe(false);
    expect(hasPermission("manager", "platform:settings")).toBe(false);
  });
});

describe("RBAC — hasAllPermissions / hasAnyPermission", () => {
  it("hasAllPermissions should require ALL permissions", () => {
    expect(hasAllPermissions("admin", ["billing:manage", "platform:health"])).toBe(true);
    expect(hasAllPermissions("manager", ["billing:read", "billing:manage"])).toBe(false);
  });

  it("hasAnyPermission should require at least ONE permission", () => {
    expect(hasAnyPermission("manager", ["billing:read", "billing:manage"])).toBe(true);
    expect(hasAnyPermission("viewer", ["billing:read", "billing:manage"])).toBe(false);
  });
});

describe("RBAC — Labels & Colors", () => {
  it("should return correct labels for all roles", () => {
    expect(getRoleLabel("super_admin")).toBe("Super Admin");
    expect(getRoleLabel("admin")).toBe("Administrador");
    expect(getRoleLabel("manager")).toBe("Manager");
    expect(getRoleLabel("user")).toBe("Usuario");
    expect(getRoleLabel("viewer")).toBe("Solo Lectura");
  });

  it("should return non-empty color classes for all roles", () => {
    ALL_ROLES.forEach((role) => {
      const color = getRoleColor(role);
      expect(color).toBeTruthy();
      expect(color.length).toBeGreaterThan(0);
    });
  });
});

describe("RBAC — Security Edge Cases", () => {
  it("each higher role should have strictly more permissions than lower", () => {
    const hierarchy: Role[] = ["viewer", "user", "manager", "admin", "super_admin"];
    for (let i = 1; i < hierarchy.length; i++) {
      const lower = getPermissionsForRole(hierarchy[i - 1]);
      const higher = getPermissionsForRole(hierarchy[i]);
      expect(higher.size).toBeGreaterThan(lower.size);
      // All lower permissions should be in higher
      lower.forEach((p) => {
        expect(higher.has(p)).toBe(true);
      });
    }
  });

  it("critical permissions should only be available to admin+", () => {
    const criticalPerms: Permission[] = [
      "billing:manage", "platform:health", "security:manage",
      "agents:configure", "users:manage_roles",
    ];
    criticalPerms.forEach((p) => {
      expect(hasPermission("viewer", p)).toBe(false);
      expect(hasPermission("user", p)).toBe(false);
      expect(hasPermission("admin", p)).toBe(true);
    });
  });

  it("platform:settings and users:delete should be super_admin only", () => {
    expect(hasPermission("admin", "platform:settings")).toBe(false);
    expect(hasPermission("admin", "users:delete")).toBe(false);
    expect(hasPermission("super_admin", "platform:settings")).toBe(true);
    expect(hasPermission("super_admin", "users:delete")).toBe(true);
  });
});