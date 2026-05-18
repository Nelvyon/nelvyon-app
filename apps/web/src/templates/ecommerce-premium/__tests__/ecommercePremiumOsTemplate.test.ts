import { describe, expect, it } from "vitest";

import { ECOMMERCE_PREMIUM_DELIVERY_ITEMS } from "@/templates/ecommerce-premium/checklist";
import { ecommercePremiumNelvyonDemoStore, findEcommercePremiumProductBySlug } from "@/templates/ecommerce-premium/demo";
import { ECOMMERCE_PREMIUM_PREVIEW_BASE } from "@/templates/ecommerce-premium/paths";
import { buildEcommercePremiumMetadata } from "@/templates/ecommerce-premium/seo";

describe("Ecommerce Premium OS template", () => {
  it("builds catalog and product-page metadata", () => {
    const catalog = buildEcommercePremiumMetadata(ecommercePremiumNelvyonDemoStore.seo);
    expect(catalog.title).toBe(ecommercePremiumNelvyonDemoStore.seo.title);
    const prod = ecommercePremiumNelvyonDemoStore.products[0];
    expect(prod).toBeTruthy();
    if (!prod) return;
    const pdpMeta = buildEcommercePremiumMetadata(prod.seo);
    expect(pdpMeta.openGraph?.title).toBe(prod.seo.title);
    const chk = buildEcommercePremiumMetadata(ecommercePremiumNelvyonDemoStore.checkout.seo);
    expect(chk.description).toBe(ecommercePremiumNelvyonDemoStore.checkout.seo.description);
  });

  it("resolves products by slug for PDP routes", () => {
    expect(findEcommercePremiumProductBySlug("classic-tote")?.slug).toBe("classic-tote");
    expect(findEcommercePremiumProductBySlug("unknown")).toBeUndefined();
  });

  it("delivery checklist aligns with ecommerce_premium_v1 and v2 DS", () => {
    expect(ECOMMERCE_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(11);
    const blob = ECOMMERCE_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/global/risk-queue")).toBe(true);
    expect(blob.includes("/os/observability/incidents")).toBe(true);
    expect(blob.includes("lazy")).toBe(true);
    expect(blob.includes("design system")).toBe(true);
    expect(ECOMMERCE_PREMIUM_DELIVERY_ITEMS.some((i) => i.source === "template")).toBe(true);
    expect(ECOMMERCE_PREMIUM_PREVIEW_BASE.startsWith("/os/")).toBe(true);
    expect(ECOMMERCE_PREMIUM_DELIVERY_ITEMS.every((item) => ["ok", "warn", "crit", "pending"].includes(item.status))).toBe(true);
  });
});
