import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isAutonomousProductionEnabled } from "../packOrchestrator";

describe("isAutonomousProductionEnabled", () => {
  afterEach(() => {
    delete process.env.AUTONOMOUS_PRODUCTION;
  });

  it("returns false when AUTONOMOUS_PRODUCTION is not set", () => {
    delete process.env.AUTONOMOUS_PRODUCTION;
    expect(isAutonomousProductionEnabled()).toBe(false);
  });

  it("returns false when AUTONOMOUS_PRODUCTION=false", () => {
    process.env.AUTONOMOUS_PRODUCTION = "false";
    expect(isAutonomousProductionEnabled()).toBe(false);
  });

  it("returns true when AUTONOMOUS_PRODUCTION=true", () => {
    process.env.AUTONOMOUS_PRODUCTION = "true";
    expect(isAutonomousProductionEnabled()).toBe(true);
  });

  it("returns false for typo values (TRUE, True, 1, yes)", () => {
    for (const v of ["TRUE", "True", "1", "yes"]) {
      process.env.AUTONOMOUS_PRODUCTION = v;
      expect(isAutonomousProductionEnabled()).toBe(false);
    }
  });
});
