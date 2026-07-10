import { describe, expect, it, vi } from "vitest";

import { HTTP_SERVICES_TO_CHECK } from "../statusChecker";

describe("statusChecker HTTP services", () => {
  it("probes live and os health endpoints", () => {
    const names = HTTP_SERVICES_TO_CHECK.map((s) => s.name);
    expect(names).toContain("api");
    expect(names).toContain("agents");
    expect(HTTP_SERVICES_TO_CHECK.find((s) => s.name === "api")?.url).toBe("/api/health/live");
    expect(HTTP_SERVICES_TO_CHECK.find((s) => s.name === "agents")?.url).toBe("/api/os/health");
  });

  it("does not probe external AWS email root URL", () => {
    for (const s of HTTP_SERVICES_TO_CHECK) {
      expect(s.url).not.toContain("amazonaws.com");
    }
  });
});

describe("mapHealthToService via runAllChecks integration", () => {
  it("exports getCurrentStatus", async () => {
    const mod = await import("../statusChecker");
    expect(typeof mod.getCurrentStatus).toBe("function");
  });
});
