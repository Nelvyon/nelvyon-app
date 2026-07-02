import { describe, expect, it } from "vitest";

import { buildGenericProductionDeliverable, stripMockUrls } from "@/lib/packs/genericProductionDeliverable";

describe("genericProductionDeliverable", () => {
  it("stripMockUrls removes mock:// from nested objects", () => {
    const cleaned = stripMockUrls({
      pdf_url: "mock://storage/x.pdf",
      ok: "https://good.test",
      nested: { bad: "mock://artifacts/a.json" },
    });
    expect(JSON.stringify(cleaned).includes("mock://")).toBe(false);
    expect((cleaned as { ok: string }).ok).toBe("https://good.test");
  });

  it("buildGenericProductionDeliverable never contains mock://", () => {
    const d = buildGenericProductionDeliverable({
      sku: "NELVYON-SEO",
      packId: "social-calendar-pack",
      packRunId: "run-1",
      intake: {
        business_name: "QA Cafe",
        sector: "local",
        city: "Madrid",
        country: "ES",
        value_proposition: "Cafe premium",
        primary_cta: "Reservar",
      },
      simulation: {
        project: {
          qa: { score: 88, passed: true },
          artifacts: {
            report: { pdf_url: "mock://storage/old.pdf", sections_complete: 10 },
          },
        },
        os_publish: null,
        escalated: false,
      } as never,
      osClientId: "c1",
      osProjectId: "p1",
      workspaceId: 1,
    });

    const blob = JSON.stringify(d);
    expect(blob.includes("mock://")).toBe(false);
    expect(d.file_url?.startsWith("http")).toBe(true);
    expect(d.title).toBe("Auditoría SEO");
  });
});
