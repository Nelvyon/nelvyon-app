// @ts-nocheck — excluido del typecheck de apps/web (misma convención que otros __tests__ backend)
import { describe, expect, it } from "vitest";

import { formatBenchmarkComparison, getBenchmark } from "../industryBenchmarks";

describe("industry benchmarks", () => {
  it("getBenchmark googleAds averageCTR ecommerce", () => {
    expect(getBenchmark("googleAds", "averageCTR", "ecommerce")).toBe(0.0571);
  });

  it("getBenchmark unknown industry falls back to default", () => {
    expect(getBenchmark("googleAds", "averageCTR", "unknown")).toBe(0.0621);
  });

  it("formatBenchmarkComparison above benchmark → EXCELENTE", () => {
    const text = formatBenchmarkComparison(0.085, 0.062, "CTR");
    expect(text).toContain("EXCELENTE");
  });

  it("formatBenchmarkComparison below benchmark → CRÍTICO", () => {
    const text = formatBenchmarkComparison(0.031, 0.062, "CTR");
    expect(text).toContain("CRÍTICO");
  });

  it("getBenchmark invalid channel returns null", () => {
    expect(getBenchmark("invalid", "averageCTR", "ecommerce")).toBeNull();
  });
});
