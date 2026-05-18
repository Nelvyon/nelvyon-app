import { describe, expect, it } from "vitest";

import { contenidoCopywritingPremiumNelvyonDemoProject } from "@/templates/contenido-copywriting-premium/demo";
import { CONTENIDO_COPYWRITING_PREMIUM_PREVIEW_PATH } from "@/templates/contenido-copywriting-premium/paths";
import { CONTENIDO_PREMIUM_DELIVERY_ITEMS } from "@/templates/contenido-copywriting-premium/checklist";
import { buildContenidoPremiumMetadata } from "@/templates/contenido-copywriting-premium/seo";

describe("Contenido y Copywriting Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildContenidoPremiumMetadata(contenidoCopywritingPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(contenidoCopywritingPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(contenidoCopywritingPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and format badges", () => {
    const mods = new Set(contenidoCopywritingPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("strategy_voice")).toBe(true);
    expect(mods.has("editorial_calendar")).toBe(true);
    expect(mods.has("writing_copy")).toBe(true);
    expect(mods.has("review_quality")).toBe(true);
    expect(mods.has("seo_onpage")).toBe(true);
    expect(mods.has("deliverables_reporting")).toBe(true);
    const flat = contenidoCopywritingPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const formats = new Set(flat.flatMap((i) => i.formats ?? []));
    expect(formats.has("blog")).toBe(true);
    expect(formats.has("landing")).toBe(true);
    expect(formats.has("web_copy")).toBe(true);
    expect(formats.has("email_copy")).toBe(true);
    expect(formats.has("ads_copy")).toBe(true);
    expect(formats.has("script")).toBe(true);
    expect(formats.has("social_media")).toBe(true);
    expect(formats.has("seo_content")).toBe(true);
    expect(flat.some((i) => (i.formats?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with contenido_copywriting_premium_v1 runbook and DS v2", () => {
    expect(CONTENIDO_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(13);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(CONTENIDO_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = CONTENIDO_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/app/branding")).toBe(true);
    expect(blob.includes("/os/seo-premium")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(CONTENIDO_COPYWRITING_PREMIUM_PREVIEW_PATH).toBe("/os/contenido-copywriting-premium/preview");
  });
});
