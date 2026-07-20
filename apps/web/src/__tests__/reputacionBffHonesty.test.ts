/**
 * Reputacion BFF — empty alerts must be marked degraded (honest).
 */
import { describe, expect, it } from "vitest";
import { EMPTY_ALERTS, EMPTY_UNIFIED_REPUTACION } from "@/lib/reputacionBffRoute";

describe("reputacionBffRoute honesty", () => {
  it("EMPTY_ALERTS is degraded", () => {
    expect(EMPTY_ALERTS.degraded).toBe(true);
    expect(EMPTY_ALERTS.degraded_reason).toBeTruthy();
    expect(EMPTY_ALERTS.active_count).toBe(0);
  });

  it("EMPTY_UNIFIED_REPUTACION is degraded", () => {
    expect(EMPTY_UNIFIED_REPUTACION.degraded).toBe(true);
  });
});
