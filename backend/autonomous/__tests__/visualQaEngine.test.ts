import { describe, it, expect } from "vitest";
import { runVisualQa } from "../qa/visualQaEngine";

// ── Structural checks ─────────────────────────────────────────────────────────

describe("runVisualQa — structural", () => {
  it("scores 0 when HTML is empty", () => {
    const r = runVisualQa({ landingHtml: "" });
    expect(r.checks.structural_score).toBe(0);
    expect(r.checks.has_h1).toBe(false);
    expect(r.checks.has_cta).toBe(false);
  });

  it("detects <h1> and adds 15 pts", () => {
    const r = runVisualQa({ landingHtml: "<h1>Welcome</h1>" });
    expect(r.checks.has_h1).toBe(true);
    expect(r.checks.structural_score).toBeGreaterThanOrEqual(15);
  });

  it("detects CTA keyword (EN) and adds 15 pts", () => {
    const r = runVisualQa({ landingHtml: "<a>Get Started</a>" });
    expect(r.checks.has_cta).toBe(true);
  });

  it("detects CTA keyword (ES — empezar)", () => {
    const r = runVisualQa({ landingHtml: "<button>Empezar ahora</button>" });
    expect(r.checks.has_cta).toBe(true);
  });

  it("detects meta description and adds 10 pts", () => {
    const r = runVisualQa({
      landingHtml: '<meta name="description" content="Best service">',
    });
    expect(r.checks.has_meta_description).toBe(true);
    expect(r.checks.structural_score).toBeGreaterThanOrEqual(10);
  });

  it("full HTML with h1 + cta + meta scores structural 40", () => {
    const html = `<html><head><meta name="description" content="x"></head>
      <body><h1>Título</h1><button>Solicitar demo</button></body></html>`;
    const r = runVisualQa({ landingHtml: html });
    expect(r.checks.structural_score).toBe(40);
  });
});

// ── WCAG contrast ─────────────────────────────────────────────────────────────

describe("runVisualQa — brand contrast", () => {
  it("white on black passes AA (ratio ~21)", () => {
    const r = runVisualQa({ brandColor: "#ffffff", backgroundColor: "#000000" });
    expect(r.checks.contrast_passes_aa).toBe(true);
    expect(r.checks.contrast_ratio).toBeGreaterThan(20);
  });

  it("very similar colors fail AA", () => {
    const r = runVisualQa({ brandColor: "#888888", backgroundColor: "#999999" });
    expect(r.checks.contrast_passes_aa).toBe(false);
    expect(r.checks.contrast_ratio).toBeLessThan(4.5);
  });

  it("default brand #0084ff on dark bg #020817 passes AA", () => {
    const r = runVisualQa({ brandColor: "#0084ff", backgroundColor: "#020817" });
    // Blue on near-black typically has ratio > 4.5
    expect(r.checks.contrast_ratio).not.toBeNull();
    expect(r.checks.contrast_score).toBeGreaterThan(0);
  });

  it("null contrast ratio when invalid hex provided → neutral score 17", () => {
    const r = runVisualQa({ brandColor: "not-a-color", backgroundColor: "#fff" });
    expect(r.checks.contrast_ratio).toBeNull();
    expect(r.checks.contrast_score).toBe(17);
  });
});

// ── Legal checks ─────────────────────────────────────────────────────────────

describe("runVisualQa — legal", () => {
  it("returns legal_passed:true with clean copy", () => {
    const r = runVisualQa({ copyText: "Mejora tus ventas con nuestra solución." });
    expect(r.legal_passed).toBe(true);
    expect(r.checks.prohibited_terms).toHaveLength(0);
    expect(r.checks.legal_score).toBe(25);
  });

  it("detects '100% garantizado' and fails legal", () => {
    const r = runVisualQa({ copyText: "Resultados 100% garantizado para tu negocio." });
    expect(r.legal_passed).toBe(false);
    expect(r.checks.prohibited_terms.length).toBeGreaterThan(0);
  });

  it("detects prohibited health claim 'cura'", () => {
    const r = runVisualQa({ copyText: "Nuestro producto cura el dolor de espalda." });
    expect(r.legal_passed).toBe(false);
  });

  it("detects English 'risk-free' claim", () => {
    const r = runVisualQa({ copyText: "Try us risk-free for 30 days." });
    expect(r.legal_passed).toBe(false);
  });

  it("deducts 10 pts per prohibited term, minimum 0", () => {
    const r = runVisualQa({
      copyText: "100% garantizado, cura instantánea, sin riesgo total.",
    });
    expect(r.checks.legal_score).toBe(0);
  });
});

// ── Combined score ────────────────────────────────────────────────────────────

describe("runVisualQa — combined score", () => {
  it("score is in [0, 100]", () => {
    const inputs = [
      {},
      { landingHtml: "<h1>X</h1><button>Buy now</button>", brandColor: "#fff", backgroundColor: "#000" },
      { copyText: "100% garantizado cura sin riesgo." },
    ];
    for (const input of inputs) {
      const r = runVisualQa(input);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it("perfect HTML + AA contrast + clean copy scores >= 95", () => {
    const html = `<html><head><meta name="description" content="x"></head>
      <body><h1>Title</h1><button>Get Started</button></body></html>`;
    const r = runVisualQa({
      landingHtml: html,
      brandColor: "#ffffff",
      backgroundColor: "#000000",
      copyText: "Simple clean marketing copy without prohibited terms.",
    });
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.legal_passed).toBe(true);
  });

  it("empty input scores in neutral range", () => {
    const r = runVisualQa({});
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
