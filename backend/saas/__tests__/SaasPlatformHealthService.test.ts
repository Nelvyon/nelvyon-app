import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SaasPlatformHealthService,
  getSaasPlatformHealthService,
  resetSaasPlatformHealthServiceForTests,
} from "../SaasPlatformHealthService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

vi.mock("../SaasIntegrationsHubService", () => ({
  getSaasIntegrationsHubService: () => ({
    listConnections: vi.fn().mockResolvedValue([
      { slug: "meta", status: "connected", connectedAccount: "Biz 1" },
      { slug: "google", status: "disconnected", connectedAccount: null },
    ]),
  }),
}));

vi.mock("../SaasSmsService", () => ({
  getSaasSmsService: () => ({
    getStatus: () => ({ configured: false, fromNumber: null }),
  }),
}));

vi.mock("../SaasDialerService", () => ({
  getSaasDialerService: () => ({
    getConfig: () => ({ configured: false, fromNumber: null }),
  }),
}));

vi.mock("../SaasWhatsAppCloudService", () => ({
  getSaasWhatsAppCloudService: () => ({
    getConfig: vi.fn().mockResolvedValue({ configured: false, provider: null }),
  }),
}));

const ENV_BACKUP: Record<string, string | undefined> = {};
const ENV_KEYS = [
  "SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "SES_FROM_EMAIL",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_STARTER", "STRIPE_PRICE_ID_PRO", "STRIPE_PRICE_ID_AGENCY",
  "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER",
];

beforeEach(() => {
  for (const key of ENV_KEYS) {
    ENV_BACKUP[key] = process.env[key];
    delete process.env[key];
  }
  resetSaasPlatformHealthServiceForTests();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (ENV_BACKUP[key] === undefined) delete process.env[key];
    else process.env[key] = ENV_BACKUP[key];
  }
});

function mockDb(steps?: Partial<Record<string, boolean>>) {
  const defaults = {
    step_profile: false,
    step_contact: true,
    step_campaign: false,
    step_workflow: true,
    step_social: false,
    step_billing: false,
    ...steps,
  };
  const db = {
    query: vi.fn().mockResolvedValue([defaults]),
  } as unknown as SaasPostgresPort;
  resetSaasPlatformHealthServiceForTests();
  return db;
}

describe("SaasPlatformHealthService", () => {
  it("returns degraded when platform env is missing", async () => {
    const db = mockDb();
    const svc = new SaasPlatformHealthService(db);
    const report = await svc.getReport("tenant-1");
    expect(report.score).toBeLessThan(90);
    expect(report.status).not.toBe("healthy");
    expect(report.items.find((i) => i.id === "ses")?.configured).toBe(false);
  });

  it("returns higher score when SES and Stripe env are set", async () => {
    process.env.SES_ACCESS_KEY_ID = "x";
    process.env.SES_SECRET_ACCESS_KEY = "y";
    process.env.SES_FROM_EMAIL = "noreply@test.com";
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    process.env.STRIPE_PRICE_ID_STARTER = "p1";
    process.env.STRIPE_PRICE_ID_PRO = "p2";
    process.env.STRIPE_PRICE_ID_AGENCY = "p3";

    const db = mockDb();
    const svc = new SaasPlatformHealthService(db);
    const report = await svc.getReport("tenant-1");
    expect(report.items.find((i) => i.id === "ses")?.status).toBe("ok");
    expect(report.items.find((i) => i.id === "stripe")?.status).toBe("ok");
    expect(report.score).toBeGreaterThan(50);
  });

  it("includes activation progress", async () => {
    const db = mockDb({ step_contact: true, step_workflow: true });
    const svc = new SaasPlatformHealthService(db);
    const report = await svc.getReport("tenant-1");
    expect(report.activation.done).toBe(2);
    expect(report.activation.total).toBe(6);
  });
});
