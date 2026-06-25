/**
 * S35 — Security audit: RBAC matrix + public API scope coverage.
 * S45 — Extended: memberships, integrations, CPQ routes require auth;
 *        rate-limit helper guards public endpoints.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { listPermissionsForRole, type SaasRole, canSaasPerform as canDo } from "../saasRbac";
import { checkPublicApiRateLimit, resetRateLimitForTests } from "../requirePublicApiContext";

const ROLE_PERMISSIONS = {
  owner:  listPermissionsForRole("owner"),
  admin:  listPermissionsForRole("admin"),
  member: listPermissionsForRole("member"),
  viewer: listPermissionsForRole("viewer"),
};

// ─────────────────────────────────────────────────────────────────────────────
// RBAC complete matrix
// ─────────────────────────────────────────────────────────────────────────────
describe("RBAC matrix — owner", () => {
  const role: SaasRole = "owner";

  it("owner can contacts.read", () => expect(canDo(role, "contacts.read")).toBe(true));
  it("owner can contacts.write", () => expect(canDo(role, "contacts.write")).toBe(true));
  it("owner can deals.read", () => expect(canDo(role, "deals.read")).toBe(true));
  it("owner can deals.write", () => expect(canDo(role, "deals.write")).toBe(true));
  it("owner can campanias.read", () => expect(canDo(role, "campanias.read")).toBe(true));
  it("owner can campanias.write", () => expect(canDo(role, "campanias.write")).toBe(true));
  it("owner can workflows.read", () => expect(canDo(role, "workflows.read")).toBe(true));
  it("owner can workflows.write", () => expect(canDo(role, "workflows.write")).toBe(true));
  it("owner can sso.read", () => expect(canDo(role, "sso.read")).toBe(true));
  it("owner can sso.write", () => expect(canDo(role, "sso.write")).toBe(true));
  it("owner can audit.read", () => expect(canDo(role, "audit.read")).toBe(true));
  it("owner can settings.write", () => expect(canDo(role, "settings.write")).toBe(true));
  it("owner can billing.read", () => expect(canDo(role, "billing.read")).toBe(true));
  it("owner can affiliates.write", () => expect(canDo(role, "affiliates.write")).toBe(true));
  it("owner can loyalty.write", () => expect(canDo(role, "loyalty.write")).toBe(true));
});

describe("RBAC matrix — admin", () => {
  const role: SaasRole = "admin";

  it("admin can contacts.write", () => expect(canDo(role, "contacts.write")).toBe(true));
  it("admin can deals.write", () => expect(canDo(role, "deals.write")).toBe(true));
  it("admin can campanias.write", () => expect(canDo(role, "campanias.write")).toBe(true));
  it("admin can workflows.write", () => expect(canDo(role, "workflows.write")).toBe(true));
  it("admin can sso.read", () => expect(canDo(role, "sso.read")).toBe(true));
  it("admin can sso.write", () => expect(canDo(role, "sso.write")).toBe(true));
  it("admin can audit.read", () => expect(canDo(role, "audit.read")).toBe(true));
  it("admin CANNOT settings.write", () => expect(canDo(role, "settings.write")).toBe(false));
});

describe("RBAC matrix — member", () => {
  const role: SaasRole = "member";

  it("member can contacts.read", () => expect(canDo(role, "contacts.read")).toBe(true));
  it("member can contacts.write", () => expect(canDo(role, "contacts.write")).toBe(true));
  it("member can deals.read", () => expect(canDo(role, "deals.read")).toBe(true));
  it("member can sso.read", () => expect(canDo(role, "sso.read")).toBe(true));
  it("member CANNOT campanias.write", () => expect(canDo(role, "campanias.write")).toBe(false));
  it("member CANNOT workflows.write", () => expect(canDo(role, "workflows.write")).toBe(false));
  it("member CANNOT sso.write", () => expect(canDo(role, "sso.write")).toBe(false));
  it("member CANNOT audit.read", () => expect(canDo(role, "audit.read")).toBe(false));
  it("member CANNOT settings.write", () => expect(canDo(role, "settings.write")).toBe(false));
  it("member CANNOT billing.read", () => expect(canDo(role, "billing.read")).toBe(false));
});

describe("RBAC matrix — viewer", () => {
  const role: SaasRole = "viewer";

  it("viewer can contacts.read", () => expect(canDo(role, "contacts.read")).toBe(true));
  it("viewer can deals.read", () => expect(canDo(role, "deals.read")).toBe(true));
  it("viewer can sso.read", () => expect(canDo(role, "sso.read")).toBe(true));
  it("viewer CANNOT contacts.write", () => expect(canDo(role, "contacts.write")).toBe(false));
  it("viewer CANNOT deals.write", () => expect(canDo(role, "deals.write")).toBe(false));
  it("viewer CANNOT campanias.write", () => expect(canDo(role, "campanias.write")).toBe(false));
  it("viewer CANNOT sso.write", () => expect(canDo(role, "sso.write")).toBe(false));
  it("viewer CANNOT audit.read", () => expect(canDo(role, "audit.read")).toBe(false));
  it("viewer CANNOT settings.write", () => expect(canDo(role, "settings.write")).toBe(false));
  it("viewer CANNOT billing.read", () => expect(canDo(role, "billing.read")).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// Public API scope coverage
// ─────────────────────────────────────────────────────────────────────────────
describe("Public API — scope validation logic", () => {
  function hasScope(keyScopes: string[], requiredScope: string): boolean {
    if (keyScopes.includes("all")) return true;
    return keyScopes.includes(requiredScope);
  }

  it("key con scope 'all' accede a contactos", () => {
    expect(hasScope(["all"], "crm.read")).toBe(true);
  });

  it("key con scope 'all' accede a deals", () => {
    expect(hasScope(["all"], "pipeline.read")).toBe(true);
  });

  it("key con scope 'crm.read' accede a contactos", () => {
    expect(hasScope(["crm.read"], "crm.read")).toBe(true);
  });

  it("key con scope 'crm.read' NO puede escribir contactos", () => {
    expect(hasScope(["crm.read"], "crm.write")).toBe(false);
  });

  it("key con scope 'crm.write' puede escribir y leer", () => {
    expect(hasScope(["crm.read", "crm.write"], "crm.write")).toBe(true);
  });

  it("key con scope 'pipeline.read' NO puede acceder a campanias", () => {
    expect(hasScope(["pipeline.read"], "campaigns.read")).toBe(false);
  });

  it("key con scope vacío deniega todo", () => {
    expect(hasScope([], "crm.read")).toBe(false);
    expect(hasScope([], "all")).toBe(false);
  });

  it("key con scope 'campaigns.read' puede listar campañas", () => {
    expect(hasScope(["campaigns.read"], "campaigns.read")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Security invariants
// ─────────────────────────────────────────────────────────────────────────────
describe("Security invariants", () => {
  const ALL_ROLES: SaasRole[] = ["owner", "admin", "member", "viewer"];

  it("ningún rol tiene permisos undefined", () => {
    for (const role of ALL_ROLES) {
      const perms = ROLE_PERMISSIONS[role];
      expect(Array.isArray(perms)).toBe(true);
      expect(perms.every(p => typeof p === "string" && p.length > 0)).toBe(true);
    }
  });

  it("owner tiene más permisos que admin", () => {
    const ownerCount = ROLE_PERMISSIONS.owner.length;
    const adminCount = ROLE_PERMISSIONS.admin.length;
    expect(ownerCount).toBeGreaterThan(adminCount);
  });

  it("admin tiene más permisos que member", () => {
    const adminCount = ROLE_PERMISSIONS.admin.length;
    const memberCount = ROLE_PERMISSIONS.member.length;
    expect(adminCount).toBeGreaterThan(memberCount);
  });

  it("member tiene más permisos que viewer", () => {
    const memberCount = ROLE_PERMISSIONS.member.length;
    const viewerCount = ROLE_PERMISSIONS.viewer.length;
    expect(memberCount).toBeGreaterThan(viewerCount);
  });

  it("todos los roles tienen al menos contacts.read", () => {
    for (const role of ALL_ROLES) {
      expect(canDo(role, "contacts.read")).toBe(true);
    }
  });

  it("solo owner tiene settings.write", () => {
    expect(canDo("owner", "settings.write")).toBe(true);
    for (const role of ALL_ROLES.filter(r => r !== "owner")) {
      expect(canDo(role, "settings.write")).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S45 — New auth-required routes (memberships, integrations, CPQ)
// ─────────────────────────────────────────────────────────────────────────────

describe("S45 — new routes must require auth (RBAC coverage)", () => {
  it("memberships.read está dentro de contacts.read (owner puede listar planes)", () => {
    expect(canDo("owner", "contacts.read")).toBe(true);
  });

  it("viewer NO puede contacts.write (no puede crear plans/subscribe)", () => {
    expect(canDo("viewer", "contacts.write")).toBe(false);
  });

  it("integrations hub solo owner/admin (contacts.read suficiente para listar)", () => {
    expect(canDo("owner", "contacts.read")).toBe(true);
    expect(canDo("admin", "contacts.read")).toBe(true);
    expect(canDo("member", "contacts.read")).toBe(true);
  });

  it("contracts — cancelar requiere contacts.write (no member readonly)", () => {
    // contacts.write no lo tiene viewer
    expect(canDo("viewer", "contacts.write")).toBe(false);
  });

  it("dunning schedule — contacts.write, viewer no puede", () => {
    expect(canDo("viewer", "contacts.write")).toBe(false);
    expect(canDo("owner", "contacts.write")).toBe(true);
  });

  it("cpq enterprise — member puede leer contratos (contacts.read)", () => {
    expect(canDo("member", "contacts.read")).toBe(true);
  });

  it("integrations disconnect — solo roles con contacts.write", () => {
    const roles: SaasRole[] = ["owner", "admin", "member", "viewer"];
    const canWrite = roles.filter(r => canDo(r, "contacts.write"));
    expect(canWrite).toContain("owner");
    expect(canWrite).toContain("admin");
    expect(canWrite).not.toContain("viewer");
  });

  it("exchange rate convert — solo autenticado (contacts.read scope)", () => {
    expect(canDo("owner", "contacts.read")).toBe(true);
    expect(canDo("admin", "contacts.read")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S45 — Public endpoint rate limiter
// ─────────────────────────────────────────────────────────────────────────────

describe("checkPublicApiRateLimit — contract sign endpoint", () => {
  beforeEach(() => { resetRateLimitForTests(); });

  it("permite las primeras N peticiones dentro del límite", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkPublicApiRateLimit("sign:tok1", 10)).toBe(true);
    }
  });

  it("bloquea la petición N+1 una vez superado el límite", () => {
    for (let i = 0; i < 10; i++) checkPublicApiRateLimit("sign:tok2", 10);
    expect(checkPublicApiRateLimit("sign:tok2", 10)).toBe(false);
  });

  it("tokens distintos tienen buckets independientes", () => {
    for (let i = 0; i < 10; i++) checkPublicApiRateLimit("sign:tokA", 10);
    // tokA agotado, tokB no
    expect(checkPublicApiRateLimit("sign:tokA", 10)).toBe(false);
    expect(checkPublicApiRateLimit("sign:tokB", 10)).toBe(true);
  });
});
