/**
 * S42 — SaasIntegrationsHubService unit tests
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SaasIntegrationsHubService,
} from "../SaasIntegrationsHubService";
import type { SaasPostgresPort } from "../SaasOnboardingService";
import { INTEGRATIONS_CATALOG } from "../integrationsCatalog";

// ── Service mocks ─────────────────────────────────────────────────────────────

vi.mock("../SaasAdsDashboardService", () => ({
  getSaasAdsDashboardService: () => ({
    getStatus: vi.fn().mockResolvedValue([
      { platform: "meta", connected: true, accountName: "Meta Biz 123" },
      { platform: "google", connected: false },
    ]),
  }),
}));

vi.mock("../SaasKlaviyoService", () => ({
  getSaasKlaviyoService: () => ({
    getStatus: vi.fn().mockResolvedValue({ configured: true, accountEmail: "klaviyo@test.com" }),
  }),
}));

vi.mock("../integrationHubSync", () => ({
  loadOAuthSlugStatus: vi.fn().mockResolvedValue(new Map()),
  revokeOAuthProvider: vi.fn().mockResolvedValue(undefined),
}));

// ── Env reset ─────────────────────────────────────────────────────────────────

const ENV_BACKUP: Record<string, string | undefined> = {};
const ENV_KEYS = [
  "SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "SES_FROM_EMAIL",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "OPENAI_API_KEY", "KLAVIYO_API_KEY",
  "META_CLIENT_ID", "META_CLIENT_SECRET",
  "HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET",
  "NEXT_PUBLIC_APP_URL",
];

beforeEach(() => {
  for (const key of ENV_KEYS) {
    ENV_BACKUP[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const [key, val] of Object.entries(ENV_BACKUP)) {
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  }
  vi.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDb(rows: unknown[] = []): SaasPostgresPort {
  return { query: vi.fn().mockResolvedValue(rows) } as unknown as SaasPostgresPort;
}

function makeSvc(rows: unknown[] = []) {
  return new SaasIntegrationsHubService(makeDb(rows));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("integrationsCatalog", () => {
  it("has at least 30 connectors", () => {
    expect(INTEGRATIONS_CATALOG.length).toBeGreaterThanOrEqual(30);
  });

  it("all connectors have required fields", () => {
    for (const c of INTEGRATIONS_CATALOG) {
      expect(c.id).toBeTruthy();
      expect(c.slug).toBeTruthy();
      expect(c.displayName).toBeTruthy();
      expect(c.icon).toBeTruthy();
      expect(["ads","crm","email","commerce","analytics","comms","productivity","payments"]).toContain(c.category);
      expect(["oauth","env","db","manual"]).toContain(c.connectionType);
      expect(["live","beta","coming_soon"]).toContain(c.status);
    }
  });

  it("no duplicate slugs", () => {
    const slugs = INTEGRATIONS_CATALOG.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("listCatalog", () => {
  it("returns all catalog items with envConfigured flag", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_xxx";
    const svc = makeSvc();
    const catalog = svc.listCatalog();
    expect(catalog.length).toBe(INTEGRATIONS_CATALOG.length);
    const stripe = catalog.find((c) => c.slug === "stripe");
    expect(stripe).toBeDefined();
    expect(stripe!.envConfigured).toBe(true);
  });

  it("envConfigured is false when env vars missing", () => {
    const svc = makeSvc();
    const catalog = svc.listCatalog();
    const openai = catalog.find((c) => c.slug === "openai");
    expect(openai!.envConfigured).toBe(false);
  });
});

describe("listConnections", () => {
  it("merges ads service status into connections", async () => {
    const svc = makeSvc();
    const conns = await svc.listConnections("t1");
    const meta = conns.find((c) => c.slug === "meta");
    expect(meta!.status).toBe("connected");
    expect(meta!.connectedAccount).toBe("Meta Biz 123");
    const google = conns.find((c) => c.slug === "google");
    expect(google!.status).toBe("disconnected");
  });

  it("applies klaviyo status from service", async () => {
    const svc = makeSvc();
    const conns = await svc.listConnections("t1");
    const klaviyo = conns.find((c) => c.slug === "klaviyo");
    expect(klaviyo!.status).toBe("connected");
    expect(klaviyo!.connectedAccount).toBe("klaviyo@test.com");
  });

  it("env-based connector (ses) connected when keys present", async () => {
    process.env.SES_ACCESS_KEY_ID = "AKIA_TEST";
    process.env.SES_SECRET_ACCESS_KEY = "secret";
    process.env.SES_FROM_EMAIL = "no-reply@test.com";
    const svc = makeSvc();
    const conns = await svc.listConnections("t1");
    const ses = conns.find((c) => c.slug === "ses");
    expect(ses!.status).toBe("connected");
    expect(ses!.connectedAccount).toBe("no-reply@test.com");
  });

  it("env-based connector disconnected when keys missing", async () => {
    const svc = makeSvc();
    const conns = await svc.listConnections("t1");
    const ses = conns.find((c) => c.slug === "ses");
    expect(ses!.status).toBe("disconnected");
  });

  it("DB row overrides default status", async () => {
    const svc = makeSvc([{
      connector_slug: "hubspot",
      status: "connected",
      external_account_name: "My HubSpot",
      last_sync_at: "2026-06-01T00:00:00Z",
      error_message: null,
      metadata: {},
    }]);
    const conns = await svc.listConnections("t1");
    const hubspot = conns.find((c) => c.slug === "hubspot");
    expect(hubspot!.status).toBe("connected");
    expect(hubspot!.connectedAccount).toBe("My HubSpot");
  });

  it("returns all catalog items", async () => {
    const svc = makeSvc();
    const conns = await svc.listConnections("t1");
    expect(conns.length).toBe(INTEGRATIONS_CATALOG.length);
  });
});

describe("disconnect", () => {
  it("issues DELETE query for known slug", async () => {
    const db = makeDb();
    const svc = new SaasIntegrationsHubService(db);
    await svc.disconnect("t1", "hubspot");
    expect(vi.mocked(db.query)).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM saas_integration_connections"),
      ["t1", "hubspot"]
    );
  });

  it("throws NOT_FOUND for unknown slug", async () => {
    const svc = makeSvc();
    await expect(svc.disconnect("t1", "nonexistent_slug_xyz")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("getAuthorizeUrl", () => {
  it("returns ads OAuth route for meta when env configured", () => {
    process.env.META_CLIENT_ID = "123";
    process.env.META_CLIENT_SECRET = "secret";
    const svc = makeSvc();
    const url = svc.getAuthorizeUrl("t1", "meta", "https://app.nelvyon.com");
    expect(url).toBe("https://app.nelvyon.com/api/oauth/meta");
  });

  it("throws ENV_REQUIRED when OAuth env vars missing", () => {
    const svc = makeSvc();
    expect(() => svc.getAuthorizeUrl("t1", "hubspot", "https://app.nelvyon.com"))
      .toThrow(expect.objectContaining({ code: "ENV_REQUIRED" }));
  });

  it("throws NOT_OAUTH for env-based connector", () => {
    const svc = makeSvc();
    expect(() => svc.getAuthorizeUrl("t1", "stripe", "https://app.nelvyon.com"))
      .toThrow(expect.objectContaining({ code: "NOT_OAUTH" }));
  });

  it("throws COMING_SOON for coming_soon connector", () => {
    const svc = makeSvc();
    expect(() => svc.getAuthorizeUrl("t1", "zoho", "https://app.nelvyon.com"))
      .toThrow(expect.objectContaining({ code: "COMING_SOON" }));
  });

  it("throws NOT_FOUND for unknown slug", () => {
    const svc = makeSvc();
    expect(() => svc.getAuthorizeUrl("t1", "not_a_connector", "https://app.nelvyon.com"))
      .toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("returns generic OAuth URL for non-ads OAuth provider when env configured", () => {
    process.env.HUBSPOT_CLIENT_ID = "hub_id";
    process.env.HUBSPOT_CLIENT_SECRET = "hub_secret";
    const svc = makeSvc();
    const url = svc.getAuthorizeUrl("tenant_abc", "hubspot", "https://app.nelvyon.com");
    expect(url).toContain("/api/saas/oauth/connect");
    expect(url).toContain("provider=hubspot");
  });

  it("returns manual related route for shopify", () => {
    const svc = makeSvc();
    const url = svc.getAuthorizeUrl("t1", "shopify", "https://app.nelvyon.com");
    expect(url).toBe("https://app.nelvyon.com/saas/store");
  });

  it("returns Next OAuth route for google calendar", () => {
    process.env.GOOGLE_CLIENT_ID = "g_id";
    process.env.GOOGLE_CLIENT_SECRET = "g_secret";
    const svc = makeSvc();
    const url = svc.getAuthorizeUrl("tenant_abc", "google_calendar", "https://app.nelvyon.com");
    expect(url).toBe("https://app.nelvyon.com/api/oauth/google");
  });
});

describe("buildSummary", () => {
  it("counts correctly", () => {
    const svc = makeSvc();
    const conns = [
      { slug: "meta", connectionType: "oauth", status: "connected" },
      { slug: "ses", connectionType: "env", status: "connected" },
      { slug: "hubspot", connectionType: "oauth", status: "disconnected" },
      { slug: "stripe", connectionType: "env", status: "connected" },
    ] as Parameters<typeof svc.buildSummary>[0];
    const summary = svc.buildSummary(conns);
    expect(summary.connected).toBe(3);
    expect(summary.envOnly).toBe(2);
    expect(summary.oauth).toBe(1);
    expect(summary.total).toBe(INTEGRATIONS_CATALOG.length);
  });
});
