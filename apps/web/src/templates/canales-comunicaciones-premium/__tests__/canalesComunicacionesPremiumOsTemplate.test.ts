import { describe, expect, it } from "vitest";

import { canalesPremiumNelvyonDemoProject } from "@/templates/canales-comunicaciones-premium/demo";
import { CANALES_COMUNICACIONES_PREMIUM_PREVIEW_PATH } from "@/templates/canales-comunicaciones-premium/paths";
import { CANALES_PREMIUM_DELIVERY_ITEMS } from "@/templates/canales-comunicaciones-premium/checklist";
import { buildCanalesPremiumMetadata } from "@/templates/canales-comunicaciones-premium/seo";

describe("Canales y Comunicaciones Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildCanalesPremiumMetadata(canalesPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(canalesPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(canalesPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and channel kinds", () => {
    const mods = new Set(canalesPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("channel_config")).toBe(true);
    expect(mods.has("templates_copy")).toBe(true);
    expect(mods.has("segmentation")).toBe(true);
    expect(mods.has("automations")).toBe(true);
    expect(mods.has("deliverability")).toBe(true);
    expect(mods.has("reporting")).toBe(true);
    const flat = canalesPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const withChannels = flat.filter((i) => i.channels?.length);
    expect(withChannels.length).toBeGreaterThan(0);
    const channelBlob = withChannels.flatMap((i) => i.channels ?? []).join(",");
    expect(channelBlob.includes("email")).toBe(true);
    const evid = flat.map((i) => i.evidence.toLowerCase()).join(" ");
    const labs = flat.map((i) => i.label.toLowerCase()).join(" ");
    const blob = `${evid} ${labs}`;
    expect(blob.includes("/app/communications") || blob.includes("communications")).toBe(true);
    expect(blob.includes("/automations") || blob.includes("/inbox")).toBe(true);
  });

  it("delivery checklist aligns with canales_comunicaciones_premium_v1 runbook and DS v2", () => {
    expect(CANALES_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(13);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(CANALES_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = CANALES_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("/app/communications")).toBe(true);
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/automations")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(CANALES_COMUNICACIONES_PREMIUM_PREVIEW_PATH).toBe("/os/canales-comunicaciones-premium/preview");
  });
});
