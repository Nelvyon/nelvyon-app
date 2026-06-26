/**
 * S56 — SaasPwaService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  SaasPwaService,
  type WhiteLabelPwaPort,
  type WhiteLabelBranding,
} from "../SaasPwaService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

const NO_DATA = makeDb(() => []);

function wlPort(branding: WhiteLabelBranding | null): WhiteLabelPwaPort {
  return { getConfig: async () => branding };
}

const NO_WL = wlPort(null);

// ── buildManifest ───────────────────────────────────────────────────────────────

describe("SaasPwaService — buildManifest", () => {
  it("returns Nelvyon defaults when no white-label config", async () => {
    const svc = new SaasPwaService(NO_DATA, NO_WL);
    const m = await svc.buildManifest("t1");
    expect(m.name).toBe("Nelvyon SaaS");
    expect(m.short_name).toBe("Nelvyon");
    expect(m.theme_color).toBe("#0084ff");
    expect(m.scope).toBe("/saas");
    expect(m.start_url).toBe("/saas/dashboard");
    expect(m.icons.length).toBeGreaterThan(4);
  });

  it("applies white-label name and color", async () => {
    const svc = new SaasPwaService(NO_DATA, wlPort({ agencyName: "Acme Growth", primaryColor: "#ff0066", logoUrl: null, faviconUrl: null }));
    const m = await svc.buildManifest("t1");
    expect(m.name).toBe("Acme Growth");
    expect(m.short_name).toBe("Acme");
    expect(m.theme_color).toBe("#ff0066");
  });

  it("ignores invalid hex color and uses default", async () => {
    const svc = new SaasPwaService(NO_DATA, wlPort({ agencyName: "X", primaryColor: "blue", logoUrl: null, faviconUrl: null }));
    const m = await svc.buildManifest("t1");
    expect(m.theme_color).toBe("#0084ff");
  });

  it("prepends logo icons when logoUrl set", async () => {
    const svc = new SaasPwaService(NO_DATA, wlPort({ agencyName: "X", primaryColor: null, logoUrl: "https://cdn/logo.png", faviconUrl: null }));
    const m = await svc.buildManifest("t1");
    expect(m.icons[0]!.src).toBe("https://cdn/logo.png");
    expect(m.icons.some((i) => i.src.startsWith("/icons/"))).toBe(true);
  });

  it("falls back to defaults if white-label port throws", async () => {
    const port: WhiteLabelPwaPort = { getConfig: async () => { throw new Error("db down"); } };
    const svc = new SaasPwaService(NO_DATA, port);
    const m = await svc.buildManifest("t1");
    expect(m.name).toBe("Nelvyon SaaS");
  });
});

// ── recordInstall ───────────────────────────────────────────────────────────────

describe("SaasPwaService — recordInstall", () => {
  it("inserts an install row and returns id", async () => {
    const db = makeDb((sql) => (sql.includes("INSERT INTO saas_pwa_installs") ? [{ id: "inst-1" }] : []));
    const svc = new SaasPwaService(db, NO_WL);
    const r = await svc.recordInstall("t1", { platform: "ios", userId: "u1" });
    expect(r.id).toBe("inst-1");
  });

  it("defaults platform to unknown", async () => {
    const db = makeDb(() => [{ id: "inst-2" }]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasPwaService(db, NO_WL);
    await svc.recordInstall("t1", {});
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params).toContain("unknown");
  });
});

// ── getInstallStats ─────────────────────────────────────────────────────────────

describe("SaasPwaService — getInstallStats", () => {
  it("aggregates counts by platform", async () => {
    const db = makeDb(() => [
      { platform: "ios", count: "3", last_at: "2026-06-02T00:00:00Z" },
      { platform: "android", count: "2", last_at: "2026-06-03T00:00:00Z" },
    ]);
    const svc = new SaasPwaService(db, NO_WL);
    const stats = await svc.getInstallStats("t1");
    expect(stats.total).toBe(5);
    expect(stats.byPlatform.ios).toBe(3);
    expect(stats.byPlatform.android).toBe(2);
    expect(stats.lastInstalledAt).toBe("2026-06-03T00:00:00Z");
  });

  it("returns zeros when none", async () => {
    const svc = new SaasPwaService(NO_DATA, NO_WL);
    const stats = await svc.getInstallStats("t1");
    expect(stats.total).toBe(0);
    expect(stats.lastInstalledAt).toBeNull();
  });

  it("returns zeros if table missing", async () => {
    const db = makeDb(() => { throw new Error("no table"); });
    const svc = new SaasPwaService(db, NO_WL);
    expect((await svc.getInstallStats("t1")).total).toBe(0);
  });
});

// ── getStatus ───────────────────────────────────────────────────────────────────

describe("SaasPwaService — getStatus", () => {
  it("exposes dynamic manifest url + fallback + stats", async () => {
    const db = makeDb(() => []);
    const svc = new SaasPwaService(db, NO_WL);
    const s = await svc.getStatus("t1");
    expect(s.manifestUrl).toBe("/api/saas/pwa/manifest");
    expect(s.fallbackManifestUrl).toBe("/manifest-saas.json");
    expect(s.installable).toBe(true);
    expect(s.whiteLabel).toBe(false);
    expect(s.appName).toBe("Nelvyon SaaS");
  });

  it("flags whiteLabel true and uses agency name", async () => {
    const svc = new SaasPwaService(NO_DATA, wlPort({ agencyName: "Acme", primaryColor: "#112233", logoUrl: null, faviconUrl: null }));
    const s = await svc.getStatus("t1");
    expect(s.whiteLabel).toBe(true);
    expect(s.appName).toBe("Acme");
    expect(s.themeColor).toBe("#112233");
  });
});
