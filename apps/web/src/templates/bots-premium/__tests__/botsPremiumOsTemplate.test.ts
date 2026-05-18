import { describe, expect, it } from "vitest";

import { botsPremiumNelvyonDemoProject } from "@/templates/bots-premium/demo";
import { BOTS_PREMIUM_PREVIEW_PATH } from "@/templates/bots-premium/paths";
import { BOTS_PREMIUM_DELIVERY_ITEMS } from "@/templates/bots-premium/checklist";
import { buildBotsPremiumMetadata } from "@/templates/bots-premium/seo";

describe("Bots Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildBotsPremiumMetadata(botsPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(botsPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(botsPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars", () => {
    const mods = new Set(botsPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("bot_config")).toBe(true);
    expect(mods.has("channel_deploy")).toBe(true);
    expect(mods.has("conversation")).toBe(true);
    expect(mods.has("integrations")).toBe(true);
    expect(mods.has("handoff")).toBe(true);
    expect(mods.has("reporting")).toBe(true);
    const flat = botsPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const blob = flat.map((i) => i.label.toLowerCase()).join(" ");
    expect(blob.includes("integrac") || blob.includes("webhook")).toBe(true);
    expect(blob.includes("handoff") || blob.includes("humano")).toBe(true);
  });

  it("delivery checklist aligns with bots_premium_v1 runbook and DS v2", () => {
    expect(BOTS_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(11);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(BOTS_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = BOTS_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("/app/assistant")).toBe(true);
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/automations")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(BOTS_PREMIUM_PREVIEW_PATH).toBe("/os/bots-premium/preview");
  });
});
