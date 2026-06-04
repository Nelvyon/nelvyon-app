import { describe, expect, it } from "vitest";

import { entityListUrl } from "@/features/os-shell/lib/entityQuery";

describe("entityListUrl", () => {
  it("builds query JSON for workspace filters", () => {
    const url = entityListUrl("/api/v1/entities/nelvyon_projects", {
      skip: 0,
      limit: 50,
      query: { client_id: 3, status: "active" },
    });
    expect(url).toContain("query=");
    expect(decodeURIComponent(url)).toContain("client_id");
    expect(url).toContain("limit=50");
  });
});
