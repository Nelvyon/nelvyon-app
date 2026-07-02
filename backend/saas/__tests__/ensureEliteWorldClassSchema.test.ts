import { describe, expect, it, vi } from "vitest";

import { ensureEliteWorldClassSchema, resetEliteWorldClassSchemaForTests } from "../ensureEliteWorldClassSchema";

describe("ensureEliteWorldClassSchema", () => {
  it("runs DDL once per process", async () => {
    resetEliteWorldClassSchemaForTests();
    const query = vi.fn().mockResolvedValue([]);
    await ensureEliteWorldClassSchema({ query });
    await ensureEliteWorldClassSchema({ query });
    expect(query.mock.calls.length).toBeGreaterThan(0);
    const firstLen = query.mock.calls.length;
    await ensureEliteWorldClassSchema({ query });
    expect(query.mock.calls.length).toBe(firstLen);
  });
});
