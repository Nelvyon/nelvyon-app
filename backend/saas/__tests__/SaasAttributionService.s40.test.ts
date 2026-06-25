/**
 * S40 — SaasAttributionService: multi-touch attribution models
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaasAttributionService } from "../SaasAttributionService";

type Row = Record<string, unknown>;

function makeDb(responses: Row[][]): { query: ReturnType<typeof vi.fn> } {
  let call = 0;
  return { query: vi.fn(async () => responses[call++] ?? []) };
}

const TENANT = "tenant-s40";
const now = new Date().toISOString();

// Journey: contact C1 has 3 touchpoints then 1 conversion
function makeJourney(contactId: string, sources: string[], convCount = 1) {
  const events: Row[] = sources.map((src, i) => ({
    contact_id: contactId,
    utm_source: src,
    utm_medium: "cpc",
    utm_campaign: `camp_${src}`,
    event_type: "visit",
    created_at: new Date(Date.now() - (sources.length - i) * 3_600_000).toISOString(),
  }));
  for (let i = 0; i < convCount; i++) {
    events.push({
      contact_id: contactId,
      utm_source: sources[sources.length - 1],
      utm_medium: "cpc",
      utm_campaign: `camp_${sources[sources.length - 1]}`,
      event_type: "conversion",
      created_at: new Date(Date.now() - 1000).toISOString(),
    });
  }
  return events;
}

describe("SaasAttributionService.getModelBreakdown", () => {
  it("returns empty channels if no rows", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAttributionService(db as never);
    const result = await svc.getModelBreakdown(TENANT, "first_touch", 30);
    expect(result.model).toBe("first_touch");
    expect(result.channels).toHaveLength(0);
  });

  it("first_touch: credit goes entirely to first touchpoint", async () => {
    const journey = makeJourney("c1", ["google", "meta", "email"]);
    const db = makeDb([journey]);
    const svc = new SaasAttributionService(db as never);
    const result = await svc.getModelBreakdown(TENANT, "first_touch", 30);
    expect(result.model).toBe("first_touch");
    // Only google (first touch) gets credit
    const google = result.channels.find(c => c.utmSource === "google");
    const meta   = result.channels.find(c => c.utmSource === "meta");
    const email  = result.channels.find(c => c.utmSource === "email");
    expect(google).toBeDefined();
    expect(google!.credit).toBeCloseTo(1, 3);
    expect(meta?.credit ?? 0).toBe(0);
    expect(email?.credit ?? 0).toBe(0);
  });

  it("last_touch: credit goes entirely to last touchpoint before conversion", async () => {
    const journey = makeJourney("c1", ["google", "meta", "email"]);
    const db = makeDb([journey]);
    const svc = new SaasAttributionService(db as never);
    const result = await svc.getModelBreakdown(TENANT, "last_touch", 30);
    const email = result.channels.find(c => c.utmSource === "email");
    expect(email).toBeDefined();
    expect(email!.credit).toBeCloseTo(1, 3);
    const google = result.channels.find(c => c.utmSource === "google");
    expect(google?.credit ?? 0).toBe(0);
  });

  it("linear: credit split equally across all touchpoints", async () => {
    const journey = makeJourney("c1", ["google", "meta", "email"]);
    const db = makeDb([journey]);
    const svc = new SaasAttributionService(db as never);
    const result = await svc.getModelBreakdown(TENANT, "linear", 30);
    // 3 touchpoints → each gets 1/3
    for (const ch of result.channels) {
      expect(ch.credit).toBeCloseTo(1 / 3, 2);
    }
    expect(result.channels).toHaveLength(3);
  });

  it("time_decay: recent touchpoints get more credit than older ones", async () => {
    // google is 3h before conv, meta is 2h, email is 1h → email should have most credit
    const journey = makeJourney("c1", ["google", "meta", "email"]);
    const db = makeDb([journey]);
    const svc = new SaasAttributionService(db as never);
    const result = await svc.getModelBreakdown(TENANT, "time_decay", 30);
    const sorted = [...result.channels].sort((a, b) => b.credit - a.credit);
    expect(sorted[0].utmSource).toBe("email");
  });

  it("aggregates credits when multiple contacts share same utm_source", async () => {
    const j1 = makeJourney("c1", ["google"]);
    const j2 = makeJourney("c2", ["google"]);
    const db = makeDb([[...j1, ...j2]]);
    const svc = new SaasAttributionService(db as never);
    const result = await svc.getModelBreakdown(TENANT, "first_touch", 30);
    const google = result.channels.find(c => c.utmCampaign === "camp_google");
    expect(google).toBeDefined();
    expect(google!.conversions).toBe(2);
  });

  it("single touchpoint gets full credit regardless of model", async () => {
    const journey = makeJourney("c1", ["meta"]);
    for (const model of ["first_touch", "last_touch", "linear", "time_decay"] as const) {
      const db = makeDb([journey]);
      const svc = new SaasAttributionService(db as never);
      const result = await svc.getModelBreakdown(TENANT, model, 30);
      const meta = result.channels.find(c => c.utmSource === "meta");
      expect(meta).toBeDefined();
      expect(meta!.credit).toBeCloseTo(1, 2);
    }
  });

  it("channels are sorted by credit descending", async () => {
    // c1: google→meta (2 touches, linear → 0.5 each)
    // c2: google only → 1 full credit to google
    // Result: google > meta
    const j1 = makeJourney("c1", ["google", "meta"]);
    const j2 = makeJourney("c2", ["google"]);
    const db = makeDb([[...j1, ...j2]]);
    const svc = new SaasAttributionService(db as never);
    const result = await svc.getModelBreakdown(TENANT, "linear", 30);
    expect(result.channels[0].utmSource).toBe("google");
    expect(result.channels[0].credit).toBeGreaterThan(result.channels[1]?.credit ?? 0);
  });

  it("touchpoint with no utm_campaign is still attributed by source", async () => {
    const events: Row[] = [
      { contact_id: "c1", utm_source: "direct", utm_medium: null, utm_campaign: null, event_type: "visit", created_at: now },
      { contact_id: "c1", utm_source: "direct", utm_medium: null, utm_campaign: null, event_type: "conversion", created_at: now },
    ];
    const db = makeDb([events]);
    const svc = new SaasAttributionService(db as never);
    const result = await svc.getModelBreakdown(TENANT, "last_touch", 30);
    // Should have a channel entry for direct
    expect(result.channels.length).toBeGreaterThanOrEqual(1);
  });

  it("days parameter is passed to query", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAttributionService(db as never);
    await svc.getModelBreakdown(TENANT, "linear", 7);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("saas_lead_attribution"), [TENANT, "7"]);
  });

  it("returns correct model and days in result", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAttributionService(db as never);
    const result = await svc.getModelBreakdown(TENANT, "time_decay", 14);
    expect(result.model).toBe("time_decay");
    expect(result.days).toBe(14);
  });
});
