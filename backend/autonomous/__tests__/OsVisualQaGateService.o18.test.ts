/**
 * O18 — OsVisualQaGateService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsVisualQaGateService,
  MIN_VISUAL_SCORE,
  MIN_LIGHTHOUSE,
  MAX_DIFF_PERCENT,
  type QaDbPort,
} from "../qa/OsVisualQaGateService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): QaDbPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as QaDbPort;
}

const NO_DATA = makeDb(() => []);
const svc = new OsVisualQaGateService(NO_DATA);

// A landing that scores high: h1 + cta + meta description + strong contrast, no legal issues.
const GOOD_HTML = `<!doctype html><html><head><meta name="description" content="La mejor pizza artesanal de Madrid, ingredientes frescos cada día."></head><body><h1>Pizzería Napoli</h1><p>Pizza artesanal en Madrid</p><a class="cta" href="#reservar">Reservar mesa</a></body></html>`;

// ── computeContentHash ───────────────────────────────────────────────────────────

describe("OsVisualQaGateService — computeContentHash", () => {
  it("is stable for the same normalized content", () => {
    expect(svc.computeContentHash("<h1>Hi</h1>")).toBe(svc.computeContentHash("<h1>Hi</h1>"));
  });

  it("ignores whitespace differences", () => {
    expect(svc.computeContentHash("<h1>Hi</h1>")).toBe(svc.computeContentHash("<h1>Hi</h1>   \n  "));
  });

  it("differs for different content", () => {
    expect(svc.computeContentHash("<h1>A</h1>")).not.toBe(svc.computeContentHash("<h1>B</h1>"));
  });

  it("returns 64-char hex", () => {
    expect(svc.computeContentHash("x")).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── diffPercent ──────────────────────────────────────────────────────────────────

describe("OsVisualQaGateService — diffPercent", () => {
  it("identical content → 0", () => {
    expect(svc.diffPercent("<h1>Same</h1>", "<h1>Same</h1>")).toBe(0);
  });

  it("identical after whitespace normalization → 0", () => {
    expect(svc.diffPercent("<h1>Same</h1>", "  <h1>Same</h1>\n")).toBe(0);
  });

  it("completely different → high percent", () => {
    expect(svc.diffPercent("aaaa", "bbbb")).toBeGreaterThan(50);
  });

  it("small edit → small percent", () => {
    const a = "the quick brown fox jumps over the lazy dog";
    const b = "the quick brown fox jumps over the lazy cat";
    expect(svc.diffPercent(a, b)).toBeLessThan(MAX_DIFF_PERCENT + 5);
  });
});

// ── computeLighthouseProxy ───────────────────────────────────────────────────────

describe("OsVisualQaGateService — computeLighthouseProxy", () => {
  it("is bounded 0–100", () => {
    const p = svc.computeLighthouseProxy({ landingHtml: GOOD_HTML, brandColor: "#000000", backgroundColor: "#ffffff" });
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  });

  it("good structure + strong contrast scores high", () => {
    const p = svc.computeLighthouseProxy({ landingHtml: GOOD_HTML, brandColor: "#000000", backgroundColor: "#ffffff" });
    expect(p).toBeGreaterThanOrEqual(MIN_LIGHTHOUSE);
  });

  it("empty input scores low", () => {
    expect(svc.computeLighthouseProxy({ copyText: "hi" })).toBeLessThan(MIN_LIGHTHOUSE);
  });
});

// ── runGate ──────────────────────────────────────────────────────────────────────

describe("OsVisualQaGateService — runGate", () => {
  it("passes a clean high-quality landing", () => {
    const r = svc.runGate({ landingHtml: GOOD_HTML, brandColor: "#000000", backgroundColor: "#ffffff" });
    expect(r.visualScore).toBeGreaterThanOrEqual(MIN_VISUAL_SCORE);
    expect(r.lighthouseScore).toBeGreaterThanOrEqual(MIN_LIGHTHOUSE);
    expect(r.legalPassed).toBe(true);
    expect(r.gateStatus).toBe("passed");
  });

  it("fails when visual score below threshold", () => {
    const r = svc.runGate({ copyText: "solo texto", brandColor: "#000", backgroundColor: "#fff" });
    expect(r.visualScore).toBeLessThan(MIN_VISUAL_SCORE);
    expect(r.gateStatus).toBe("failed");
    expect(r.failureReasons.some((x) => x.includes("Visual score"))).toBe(true);
  });

  it("blocks on EU prohibited legal terms", () => {
    const r = svc.runGate({
      landingHtml: GOOD_HTML.replace("Pizza artesanal en Madrid", "Adelgaza ya — 100% garantizado, sin riesgo"),
      brandColor: "#000000",
      backgroundColor: "#ffffff",
    });
    expect(r.legalPassed).toBe(false);
    expect(r.gateStatus).toBe("blocked");
    expect(r.failureReasons.some((x) => x.startsWith("Legal"))).toBe(true);
  });

  it("fails when diff exceeds max vs baseline", () => {
    const r = svc.runGate({
      landingHtml: GOOD_HTML,
      brandColor: "#000000",
      backgroundColor: "#ffffff",
      baselineHtml: "<html><body><h1>Totalmente distinto</h1><p>otra cosa</p></body></html>",
    });
    expect(r.diffPercent).not.toBeNull();
    expect(r.diffPercent!).toBeGreaterThan(MAX_DIFF_PERCENT);
    expect(r.gateStatus).toBe("failed");
    expect(r.failureReasons.some((x) => x.includes("Diff"))).toBe(true);
  });

  it("identical baseline → diff 0, still passes", () => {
    const r = svc.runGate({ landingHtml: GOOD_HTML, brandColor: "#000000", backgroundColor: "#ffffff", baselineHtml: GOOD_HTML });
    expect(r.diffPercent).toBe(0);
    expect(r.gateStatus).toBe("passed");
  });

  it("no html → null content hash", () => {
    const r = svc.runGate({ copyText: "hola mundo con texto suficiente", brandColor: "#000", backgroundColor: "#fff" });
    expect(r.contentHash).toBeNull();
  });
});

// ── persistence ──────────────────────────────────────────────────────────────────

describe("OsVisualQaGateService — persistence", () => {
  it("saveAuditRun inserts and returns id", async () => {
    const db = makeDb((sql) => (sql.includes("INSERT INTO os_qa_audit_runs") ? [{ id: "audit-1" }] : []));
    const s = new OsVisualQaGateService(db);
    const result = s.runGate({ landingHtml: GOOD_HTML, brandColor: "#000000", backgroundColor: "#ffffff" });
    const id = await s.saveAuditRun(result, { packRunId: "run-1", deliverableRef: "NELVYON-LANDING" });
    expect(id).toBe("audit-1");
  });

  it("runAndPersist never throws when DB fails", async () => {
    const db = makeDb(() => { throw new Error("db down"); });
    const s = new OsVisualQaGateService(db);
    const r = await s.runAndPersist({ landingHtml: GOOD_HTML, brandColor: "#000000", backgroundColor: "#ffffff" });
    expect(r.auditId).toBeNull();
    expect(r.gateStatus).toBe("passed");
  });

  it("getGateSummary aggregates pass rate", async () => {
    const db = makeDb(() => [
      { gate_status: "passed", count: "8", avg_visual: "90", avg_lh: "95" },
      { gate_status: "failed", count: "2", avg_visual: "70", avg_lh: "60" },
    ]);
    const s = new OsVisualQaGateService(db);
    const summary = await s.getGateSummary();
    expect(summary.total).toBe(10);
    expect(summary.passed).toBe(8);
    expect(summary.passRate).toBe(80);
  });

  it("listAuditRuns maps rows", async () => {
    const db = makeDb(() => [{
      id: "a1", pack_run_id: "r1", deliverable_ref: "x", visual_score: 90, lighthouse_score: 95,
      legal_passed: true, content_hash: "h", baseline_hash: null, diff_percent: "1.50",
      gate_status: "passed", failure_reasons: [], checks: {}, created_at: "",
    }]);
    const s = new OsVisualQaGateService(db);
    const runs = await s.listAuditRuns();
    expect(runs[0]!.diffPercent).toBe(1.5);
    expect(runs[0]!.gateStatus).toBe("passed");
  });
});
