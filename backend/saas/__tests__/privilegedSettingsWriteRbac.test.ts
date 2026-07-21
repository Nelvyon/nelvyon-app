import { describe, expect, it } from "vitest";
import { canSaasPerform } from "../saasRbac";

/**
 * Documents privileged SaaS mutations: only owner has settings.write.
 * Routes (api-keys / webhooks / team / store settings) require settings.write —
 * member/viewer with settings.read alone must not mutate.
 */
describe("privileged settings.write RBAC", () => {
  it("owner can write settings; member and viewer cannot", () => {
    expect(canSaasPerform("owner", "settings.write")).toBe(true);
    expect(canSaasPerform("admin", "settings.write")).toBe(false);
    expect(canSaasPerform("member", "settings.write")).toBe(false);
    expect(canSaasPerform("viewer", "settings.write")).toBe(false);
  });

  it("member and viewer still retain settings.read for GET surfaces", () => {
    expect(canSaasPerform("member", "settings.read")).toBe(true);
    expect(canSaasPerform("viewer", "settings.read")).toBe(true);
  });
});
