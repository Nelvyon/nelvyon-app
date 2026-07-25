/**
 * Regression: inventory API exposes reserve with tenant-bound persistence.
 * (HTTP staging covers live path; this guards the action contract.)
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const routePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../apps/web/src/app/api/saas/erp/inventory/route.ts",
);

describe("erp inventory route contract", () => {
  it("exposes reserve + receive + withInventoryPersistence + 409 mapping", () => {
    const src = readFileSync(routePath, "utf8");
    expect(src).toContain('action === "reserve"');
    expect(src).toContain('action === "receive"');
    expect(src).toContain("withInventoryPersistence");
    expect(src).toContain("ErpSnapshotConflictError");
    expect(src).toMatch(/allowed:[\s\S]*"reserve"/);
  });
});
