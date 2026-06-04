import { describe, expect, it } from "vitest";

import { buildOsIaInsights } from "../insights";

describe("buildOsIaInsights", () => {
  it("returns empty state when no source data", () => {
    const r = buildOsIaInsights({
      clients: [],
      projects: [],
      deals: [],
      tasks: [],
      outputs: [],
    });
    expect(r.hasData).toBe(false);
    expect(r.clientSummaries).toHaveLength(0);
  });

  it("summarizes client with active projects", () => {
    const r = buildOsIaInsights({
      clients: [
        {
          id: 1,
          user_id: "u1",
          workspace_id: 1,
          business_name: "Acme",
          sector: "tech",
        },
      ],
      projects: [
        {
          id: 10,
          user_id: "u1",
          workspace_id: 1,
          client_id: 1,
          name: "Web",
          project_type: "web",
          status: "active",
        },
      ],
      deals: [],
      tasks: [],
      outputs: [],
    });
    expect(r.hasData).toBe(true);
    expect(r.clientSummaries[0]?.businessName).toBe("Acme");
    expect(r.clientSummaries[0]?.summary).toContain("proyecto");
  });
});
