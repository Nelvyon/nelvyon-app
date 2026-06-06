import { afterEach, describe, expect, it, vi } from "vitest";

import { isOsProjectsCanonicalUiEnabled } from "@/features/os-shell/projects/featureFlag";

describe("isOsProjectsCanonicalUiEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to true when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_OS_PROJECTS_CANONICAL_UI", "");
    expect(isOsProjectsCanonicalUiEnabled()).toBe(true);
  });

  it("returns false when explicitly disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_OS_PROJECTS_CANONICAL_UI", "false");
    expect(isOsProjectsCanonicalUiEnabled()).toBe(false);
  });

  it("returns true for true string", () => {
    vi.stubEnv("NEXT_PUBLIC_OS_PROJECTS_CANONICAL_UI", "true");
    expect(isOsProjectsCanonicalUiEnabled()).toBe(true);
  });
});
