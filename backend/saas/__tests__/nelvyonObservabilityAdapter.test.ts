import { describe, expect, it } from "vitest";
import {
  assertObservabilityBlock2Contract,
  buildUptimeKumaMonitorBlueprint,
  getNelvyonProbeTargets,
  getObservabilityPlans,
} from "../../observability/NelvyonObservabilityAdapter";

describe("NelvyonObservabilityAdapter", () => {
  it("exposes four health probe targets", () => {
    const probes = getNelvyonProbeTargets("https://app.nelvyon.com");
    expect(probes.map((p) => p.id)).toEqual(["health", "live", "ready", "deep"]);
    expect(probes.every((p) => p.path.startsWith("https://app.nelvyon.com/api/health"))).toBe(true);
  });

  it("plans: uptime-kuma parcial, prometheus sustituido; default flags off", () => {
    const plans = getObservabilityPlans();
    const kuma = plans.find((p) => p.id === "uptime-kuma");
    const prom = plans.find((p) => p.id === "prometheus");
    expect(kuma?.decision).toBe("integrado_parcial");
    expect(kuma?.enabled).toBe(false);
    expect(prom?.decision).toBe("sustituido");
    expect(prom?.enabled).toBe(false);
    expect(kuma?.license).toBe("MIT");
    expect(prom?.license).toBe("Apache-2.0");
  });

  it("block2 contract holds and blueprint lists monitors", () => {
    expect(assertObservabilityBlock2Contract()).toEqual({ ok: true, violations: [] });
    const bp = buildUptimeKumaMonitorBlueprint("https://app.nelvyon.com");
    expect(bp.monitors).toHaveLength(4);
    expect(bp.pushUrlConfigured).toBe(false);
  });
});
