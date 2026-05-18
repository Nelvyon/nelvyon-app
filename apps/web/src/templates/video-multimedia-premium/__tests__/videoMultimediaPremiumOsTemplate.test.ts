import { describe, expect, it } from "vitest";

import { videoMultimediaPremiumNelvyonDemoProject } from "@/templates/video-multimedia-premium/demo";
import { VIDEO_MULTIMEDIA_PREMIUM_PREVIEW_PATH } from "@/templates/video-multimedia-premium/paths";
import { VIDEO_PREMIUM_DELIVERY_ITEMS } from "@/templates/video-multimedia-premium/checklist";
import { buildVideoPremiumMetadata } from "@/templates/video-multimedia-premium/seo";

describe("Video y Multimedia Premium OS template", () => {
  it("builds page metadata", () => {
    const meta = buildVideoPremiumMetadata(videoMultimediaPremiumNelvyonDemoProject.pageSeo);
    expect(meta.title).toBe(videoMultimediaPremiumNelvyonDemoProject.pageSeo.title);
    expect(meta.openGraph?.title).toBe(videoMultimediaPremiumNelvyonDemoProject.pageSeo.title);
  });

  it("demo project covers delivery pillars and format badges", () => {
    const mods = new Set(videoMultimediaPremiumNelvyonDemoProject.sections.map((s) => s.module));
    expect(mods.has("briefing_script")).toBe(true);
    expect(mods.has("production")).toBe(true);
    expect(mods.has("editing_post")).toBe(true);
    expect(mods.has("mograph")).toBe(true);
    expect(mods.has("subtitles_accessibility")).toBe(true);
    expect(mods.has("delivery_formats")).toBe(true);
    expect(mods.has("reporting")).toBe(true);
    const flat = videoMultimediaPremiumNelvyonDemoProject.sections.flatMap((s) => s.items);
    expect(flat.every((i) => ["P1", "P2", "P3"].includes(i.priority))).toBe(true);
    expect(flat.every((i) => ["pass", "warn", "fail", "pending"].includes(i.status))).toBe(true);
    const formats = new Set(flat.flatMap((i) => i.formats ?? []));
    expect(formats.has("corporate")).toBe(true);
    expect(formats.has("social_clip")).toBe(true);
    expect(formats.has("reel")).toBe(true);
    expect(formats.has("explainer")).toBe(true);
    expect(formats.has("testimonial")).toBe(true);
    expect(formats.has("ad_video")).toBe(true);
    expect(formats.has("podcast")).toBe(true);
    expect(formats.has("motion_graphics")).toBe(true);
    expect(flat.some((i) => (i.formats?.length ?? 0) > 0)).toBe(true);
  });

  it("delivery checklist aligns with video_multimedia_premium_v1 runbook and DS v2", () => {
    expect(VIDEO_PREMIUM_DELIVERY_ITEMS.length).toBeGreaterThanOrEqual(14);
    const statuses = new Set(["ok", "warn", "crit", "pending"]);
    expect(VIDEO_PREMIUM_DELIVERY_ITEMS.every((i) => statuses.has(i.status))).toBe(true);
    const blob = VIDEO_PREMIUM_DELIVERY_ITEMS.map((i) => `${i.area} ${i.description}`).join(" ").toLowerCase();
    expect(blob.includes("pnpm gate")).toBe(true);
    expect(blob.includes("/os/contenido-copywriting-premium")).toBe(true);
    expect(blob.includes("/help")).toBe(true);
    expect(blob.includes("/crm/deals")).toBe(true);
    expect(blob.includes("design system") || blob.includes("@/design-system")).toBe(true);
    expect(blob.includes("/os/design-system")).toBe(true);
    expect(VIDEO_MULTIMEDIA_PREMIUM_PREVIEW_PATH).toBe("/os/video-multimedia-premium/preview");
  });
});
