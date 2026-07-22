import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../../../");

describe("sector playbooks exist with QA gate", () => {
  const files = [
    "docs/agency-playbooks/SECTOR_LOCAL_SMB.md",
    "docs/agency-playbooks/SECTOR_ECOMMERCE.md",
    "docs/agency-playbooks/SECTOR_SAAS_B2B.md",
  ];

  it("files exist and mention QA ≥85 / needs_review", () => {
    for (const rel of files) {
      const p = join(root, rel);
      expect(existsSync(p), rel).toBe(true);
      const body = readFileSync(p, "utf8");
      expect(body).toMatch(/85/);
      expect(body.toLowerCase()).toMatch(/needs_review|qa/);
    }
  });
});
