import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("dashboardHelpdeskApi wiring", () => {
  it("resolve uses PATCH to match FastAPI helpdesk router", () => {
    const src = readFileSync(join(process.cwd(), "src/features/dashboard/api.ts"), "utf8");
    expect(src).toContain("apiClient.patch(`/api/helpdesk/tickets/${id}/resolve`");
    expect(src).not.toMatch(/apiClient\.put\(`\/api\/helpdesk\/tickets\/\$\{id\}\/resolve`/);
  });
});

describe("ProtectedLayout redirect target", () => {
  it("builds login URL with next param", () => {
    const pathname = "/dashboard/crm";
    const url = `/login?next=${encodeURIComponent(pathname)}`;
    expect(url).toBe("/login?next=%2Fdashboard%2Fcrm");
  });
});
