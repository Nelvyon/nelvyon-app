import { describe, expect, it, vi, afterEach } from "vitest";

import { isOsClientsCanonicalUiEnabled } from "@/features/os-shell/clients/featureFlag";

describe("isOsClientsCanonicalUiEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to true when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_OS_CLIENTS_CANONICAL_UI", "");
    expect(isOsClientsCanonicalUiEnabled()).toBe(true);
  });

  it("returns false when explicitly disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_OS_CLIENTS_CANONICAL_UI", "false");
    expect(isOsClientsCanonicalUiEnabled()).toBe(false);
  });

  it("returns true for true string", () => {
    vi.stubEnv("NEXT_PUBLIC_OS_CLIENTS_CANONICAL_UI", "true");
    expect(isOsClientsCanonicalUiEnabled()).toBe(true);
  });
});
