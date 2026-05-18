import { describe, expect, it } from "vitest";

import { WEB_PREMIUM_DELIVERY_ITEMS } from "@/templates/web-premium/checklist";
import { buildWebPremiumMetadata } from "@/templates/web-premium/seo";

describe("Web Premium OS template", () => {
  it("builds configurable SEO metadata", () => {
    const meta = buildWebPremiumMetadata({
      title: "Client title",
      description: "Client description",
      canonicalPath: "/client-path",
      siteName: "Client site",
      locale: "es_ES",
    });
    expect(meta.title).toBe("Client title");
    expect(meta.description).toBe("Client description");
    expect(meta.openGraph?.title).toBe("Client title");
    expect(meta.openGraph?.description).toBe("Client description");
    expect(meta.openGraph?.locale).toBe("es_ES");
  });

  it("delivery checklist includes web_premium_v1 expectations and v2 DS row", () => {
    expect(WEB_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(11);
    const joined = WEB_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(joined.includes("pnpm gate")).toBe(true);
    expect(joined.includes("observability")).toBe(true);
    expect(joined.includes("responsive")).toBe(true);
    expect(joined.includes("lazy")).toBe(true);
    expect(joined.includes("design system")).toBe(true);
    expect(WEB_PREMIUM_DELIVERY_ITEMS.some((item) => item.source === "runbook")).toBe(true);
    expect(WEB_PREMIUM_DELIVERY_ITEMS.every((item) => ["ok", "warn", "crit", "pending"].includes(item.status))).toBe(true);
  });
});
