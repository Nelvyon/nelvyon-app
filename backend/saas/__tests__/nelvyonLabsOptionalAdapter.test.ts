import { describe, expect, it } from "vitest";
import {
  assertLabsOptionalContracts,
  getEnabledLabsOptional,
  getLabsOptionalPlans,
} from "../../labs/NelvyonLabsOptionalAdapter";

describe("NelvyonLabsOptionalAdapter", () => {
  it("defaults all optional Labs capabilities off", () => {
    expect(getEnabledLabsOptional()).toEqual([]);
    expect(getLabsOptionalPlans().every((p) => p.enabled === false)).toBe(true);
  });

  it("includes MCP TS contract without OpenClaw wiring", () => {
    const mcp = getLabsOptionalPlans().find((p) => p.id === "mcp-sdk-typescript");
    expect(mcp?.license).toBe("MIT");
    expect(mcp?.openClawSafe).toBe(true);
    expect(assertLabsOptionalContracts()).toEqual({ ok: true, violations: [] });
  });
});
