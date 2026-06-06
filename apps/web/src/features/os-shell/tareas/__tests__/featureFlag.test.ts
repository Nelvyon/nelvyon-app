import { afterEach, describe, expect, it, vi } from "vitest";

import { isOsTasksCanonicalUiEnabled } from "@/features/os-shell/tareas/featureFlag";

describe("isOsTasksCanonicalUiEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to true when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_OS_TASKS_CANONICAL_UI", "");
    expect(isOsTasksCanonicalUiEnabled()).toBe(true);
  });

  it("returns false when disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_OS_TASKS_CANONICAL_UI", "false");
    expect(isOsTasksCanonicalUiEnabled()).toBe(false);
  });
});
