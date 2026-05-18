import { describe, expect, it } from "vitest";

import { isModuleAllowed, isPathAllowed } from "@/core/platform/surfacePolicy";

describe("surface policy", () => {
  it("blocks internal routes in client mode", () => {
    expect(isPathAllowed("/os", "client")).toBe(false);
    expect(isPathAllowed("/analytics", "client")).toBe(false);
    expect(isPathAllowed("/billing/upgrade", "client")).toBe(false);
    expect(isPathAllowed("/settings/audit", "client")).toBe(false);
    expect(isPathAllowed("/sign-in", "client")).toBe(false);
    expect(isPathAllowed("/crm/clients", "client")).toBe(false);
    expect(isPathAllowed("/app/branding/policy", "client")).toBe(false);
    expect(isPathAllowed("/app/branding/preview-v2", "client")).toBe(false);
  });

  it("allows explicit client portal routes", () => {
    expect(isPathAllowed("/", "client")).toBe(true);
    expect(isPathAllowed("/account", "client")).toBe(true);
    expect(isPathAllowed("/inbox/tickets/11", "client")).toBe(true);
    expect(isPathAllowed("/campaigns/4", "client")).toBe(true);
    expect(isPathAllowed("/help", "client")).toBe(true);
    expect(isPathAllowed("/billing", "client")).toBe(true);
    expect(isPathAllowed("/app/advisor", "client")).toBe(true);
    expect(isPathAllowed("/app/communications", "client")).toBe(true);
    expect(isPathAllowed("/app/branding", "client")).toBe(true);
  });

  it("limits client mode modules", () => {
    expect(isModuleAllowed("inbox", "client")).toBe(true);
    expect(isModuleAllowed("campaigns", "client")).toBe(true);
    expect(isModuleAllowed("help", "client")).toBe(true);
    expect(isModuleAllowed("billing", "client")).toBe(true);
    expect(isModuleAllowed("branding", "client")).toBe(true);
    expect(isModuleAllowed("os", "client")).toBe(false);
    expect(isPathAllowed("/app/voz", "client")).toBe(false);
    expect(isModuleAllowed("voice", "client")).toBe(false);
  });
});

