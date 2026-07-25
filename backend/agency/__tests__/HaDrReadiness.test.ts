import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GRACEFUL_DEGRADATION_MODULE_PATH,
  GRACEFUL_DEGRADATION_REASON_CODES,
  HA_DR_CHECKLIST,
  HA_DR_ROLLBACK_CHECKLIST,
  HA_DR_STATELESS_ASSERTION,
  RPO_TARGET_HOURS,
  RTO_TARGET_HOURS,
  assertHaDrReadinessIntegrity,
  buildStagingHealthUrl,
  evaluateRateLimitPresence,
  getHaDrItem,
  isGracefulDegradationReasonCode,
  isMultiRegionEnabled,
  isWellFormedDegradedResponse,
  listHaDrChecklist,
  runCapacitySmoke,
  type CapacitySmokeFetcher,
} from "../HaDrReadiness";

describe("HaDrReadiness", () => {
  it("passes its own integrity assertion", () => {
    expect(assertHaDrReadinessIntegrity()).toEqual({ ok: true, violations: [] });
  });

  it("lists a defensive copy of the checklist", () => {
    const list = listHaDrChecklist();
    expect(list.length).toBe(HA_DR_CHECKLIST.length);
    list.pop();
    expect(HA_DR_CHECKLIST.length).not.toBe(list.length);
  });

  it("every checklist item has a doc path and a substantive note", () => {
    for (const item of HA_DR_CHECKLIST) {
      expect(item.docPath.length).toBeGreaterThan(0);
      expect(item.note.length).toBeGreaterThan(15);
    }
  });

  it("multi-region is always BLOCKED_EXTERNAL and never toggled on", () => {
    const item = getHaDrItem("multi_region");
    expect(item?.status).toBe("BLOCKED_EXTERNAL");
    expect(isMultiRegionEnabled()).toBe(false);
  });

  it("health checks and kill switches are IMPLEMENTED_VERIFIED (already shipped)", () => {
    expect(getHaDrItem("health_checks")?.status).toBe("IMPLEMENTED_VERIFIED");
    expect(getHaDrItem("kill_switches")?.status).toBe("IMPLEMENTED_VERIFIED");
  });

  it("builds a well-formed staging health URL", () => {
    const url = buildStagingHealthUrl("my-staging-app");
    expect(url).toBe("https://my-staging-app.up.railway.app/api/health/deep");
  });
});

describe("HaDrReadiness — RPO/RTO constants", () => {
  it("matches the documented runbook targets (RPO 24h, RTO 4h)", () => {
    expect(RPO_TARGET_HOURS).toBe(24);
    expect(RTO_TARGET_HOURS).toBe(4);
  });
});

describe("HaDrReadiness — runCapacitySmoke (fake fetcher, no real network)", () => {
  it("passes when every probe responds 200 within the latency budget", async () => {
    const fetcher: CapacitySmokeFetcher = async () => ({ status: 200 });
    const result = await runCapacitySmoke({ baseUrl: "https://staging.example.up.railway.app", fetcher, concurrency: 3 });
    expect(result.ok).toBe(true);
    expect(result.results.length).toBe(4 * 3);
    expect(result.results.every((r) => r.ok)).toBe(true);
  });

  it("fails when a probe returns a non-200 status", async () => {
    const fetcher: CapacitySmokeFetcher = async () => ({ status: 503 });
    const result = await runCapacitySmoke({ baseUrl: "https://staging.example.up.railway.app", fetcher, concurrency: 2 });
    expect(result.ok).toBe(false);
    expect(result.results.every((r) => !r.ok)).toBe(true);
  });

  it("fails closed when the fetcher throws (network error)", async () => {
    const fetcher: CapacitySmokeFetcher = async () => {
      throw new Error("ECONNREFUSED");
    };
    const result = await runCapacitySmoke({ baseUrl: "https://staging.example.up.railway.app", fetcher, concurrency: 1 });
    expect(result.ok).toBe(false);
    expect(result.results.every((r) => r.error !== null)).toBe(true);
  });

  it("fails a probe that is slower than maxLatencyMs even if status is 200", async () => {
    const fetcher: CapacitySmokeFetcher = async () => {
      await new Promise((r) => setTimeout(r, 20));
      return { status: 200 };
    };
    const result = await runCapacitySmoke({
      baseUrl: "https://staging.example.up.railway.app",
      fetcher,
      concurrency: 1,
      maxLatencyMs: 1,
    });
    expect(result.ok).toBe(false);
  });

  it("defaults to concurrency=5 across all 4 health probes when not specified", async () => {
    const fetcher: CapacitySmokeFetcher = async () => ({ status: 200 });
    const result = await runCapacitySmoke({ baseUrl: "https://staging.example.up.railway.app", fetcher });
    expect(result.concurrency).toBe(5);
    expect(result.results.length).toBe(20);
  });
});

describe("HaDrReadiness — graceful degradation pattern", () => {
  it("validates known reason codes and rejects unknown ones", () => {
    for (const code of GRACEFUL_DEGRADATION_REASON_CODES) {
      expect(isGracefulDegradationReasonCode(code)).toBe(true);
    }
    expect(isGracefulDegradationReasonCode("made_up_reason")).toBe(false);
  });

  it("validates a well-formed degraded response shape", () => {
    expect(isWellFormedDegradedResponse({ degraded: true, degraded_reason: "upstream_unavailable" })).toBe(true);
    expect(isWellFormedDegradedResponse({ degraded: true })).toBe(false);
    expect(isWellFormedDegradedResponse({ degraded: false, degraded_reason: "x" })).toBe(false);
    expect(isWellFormedDegradedResponse(null)).toBe(false);
  });

  it("the referenced module actually exists on disk and exports the same reason codes", () => {
    const root = join(__dirname, "../../../");
    const p = join(root, GRACEFUL_DEGRADATION_MODULE_PATH);
    expect(existsSync(p), p).toBe(true);
    const source = readFileSync(p, "utf8");
    for (const code of GRACEFUL_DEGRADATION_REASON_CODES) {
      expect(source, `${p} should reference "${code}"`).toContain(code);
    }
  });

  it("at least one real BFF route in the codebase uses the degraded-response pattern", () => {
    const root = join(__dirname, "../../../");
    const candidateRoutes = [
      "apps/web/src/lib/adsBffRoute.ts",
      "apps/web/src/lib/ecommerceBffRoute.ts",
      "apps/web/src/lib/socialBffRoute.ts",
      "apps/web/src/lib/funnelsBffRoute.ts",
      "apps/web/src/lib/automationsBffRoute.ts",
      "apps/web/src/lib/reputacionBffRoute.ts",
    ];
    const consumers = candidateRoutes.filter((rel) => {
      const p = join(root, rel);
      return existsSync(p) && readFileSync(p, "utf8").includes("bffDegraded");
    });
    expect(consumers.length).toBeGreaterThan(0);
  });
});

describe("HaDrReadiness — rate-limit presence", () => {
  it("passes for a sane positive value", () => {
    expect(evaluateRateLimitPresence(500)).toEqual({ ok: true, reason: null });
  });

  it("fails when absent (null/undefined)", () => {
    expect(evaluateRateLimitPresence(null).ok).toBe(false);
    expect(evaluateRateLimitPresence(undefined).ok).toBe(false);
  });

  it("fails for non-positive or non-finite values", () => {
    expect(evaluateRateLimitPresence(0).ok).toBe(false);
    expect(evaluateRateLimitPresence(-10).ok).toBe(false);
    expect(evaluateRateLimitPresence(Number.NaN).ok).toBe(false);
  });

  it("fails for an insane (absurdly high) value", () => {
    expect(evaluateRateLimitPresence(10_000_000).ok).toBe(false);
  });
});

describe("HaDrReadiness — stateless assertion metadata", () => {
  it("lists confirmed stateless facts and honestly discloses in-memory caveats", () => {
    expect(HA_DR_STATELESS_ASSERTION.statelessConfirmed.length).toBeGreaterThan(0);
    expect(HA_DR_STATELESS_ASSERTION.inMemoryCaveats.length).toBeGreaterThan(0);
    expect(HA_DR_STATELESS_ASSERTION.singleInstanceAssumed).toBe(true);
  });

  it("never claims full statelessness without caveats (honesty guard)", () => {
    expect(HA_DR_STATELESS_ASSERTION.inMemoryCaveats.some((c) => c.toLowerCase().includes("in-memory"))).toBe(true);
  });
});

describe("HaDrReadiness — rollback checklist", () => {
  it("is a non-trivial, ordered checklist", () => {
    expect(HA_DR_ROLLBACK_CHECKLIST.length).toBeGreaterThanOrEqual(4);
    for (const step of HA_DR_ROLLBACK_CHECKLIST) {
      expect(step.length).toBeGreaterThan(10);
    }
  });

  it("mentions verifying health before declaring the incident resolved", () => {
    expect(HA_DR_ROLLBACK_CHECKLIST.some((s) => s.toLowerCase().includes("health"))).toBe(true);
  });
});
