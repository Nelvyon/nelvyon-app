import { describe, expect, it, vi } from "vitest";

import { ensureEliteWorldClassSchema, resetEliteWorldClassSchemaForTests } from "../ensureEliteWorldClassSchema";
import { consultaFalsaCon } from "../../db/__tests__/consultaFalsa";

describe("ensureEliteWorldClassSchema", () => {
  it("runs DDL once per process", async () => {
    resetEliteWorldClassSchemaForTests();
    const query = consultaFalsaCon((sql) => {
      if (sql.includes("information_schema")) return [{ ok: true }];
      return [];
    });
    await ensureEliteWorldClassSchema({ query });
    await ensureEliteWorldClassSchema({ query });
    expect(query.mock.calls.length).toBeGreaterThan(0);
    const firstLen = query.mock.calls.length;
    await ensureEliteWorldClassSchema({ query });
    expect(query.mock.calls.length).toBe(firstLen);
  });
});
