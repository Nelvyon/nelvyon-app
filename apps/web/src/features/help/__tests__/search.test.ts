import { searchHelpArticles } from "@/features/help/search";

describe("searchHelpArticles", () => {
  it("returns module-filtered results", () => {
    const items = searchHelpArticles("", "campaigns");
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((x) => x.module === "campaigns")).toBe(true);
  });

  it("matches keyword in title/summary/body", () => {
    const items = searchHelpArticles("manual IDs");
    expect(items.some((x) => x.id === "campaign-first-launch")).toBe(true);
  });
});
