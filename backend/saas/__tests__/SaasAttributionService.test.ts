import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SaasAttributionService,
  resetSaasAttributionServiceForTests,
  SaasAttributionError,
} from "../SaasAttributionService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const TENANT = "tenant-attr-001";
const CONTACT_ID = "00000000-0000-0000-0000-000000000002";

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "ev-1", tenant_id: TENANT, contact_id: CONTACT_ID,
    utm_source: "google", utm_medium: "cpc", utm_campaign: "brand-2026",
    utm_content: null, utm_term: null, page_url: "/landing", referrer: null,
    event_type: "visit", created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeChannel(overrides: Record<string, unknown> = {}) {
  return {
    utm_source: "google", utm_medium: "cpc",
    visits: 120, form_submits: 8, conversions: 3, contacts: 5,
    ...overrides,
  };
}

function makeCampaign(overrides: Record<string, unknown> = {}) {
  return {
    utm_campaign: "brand-2026", utm_source: "google",
    visits: 90, form_submits: 6, conversions: 2, contacts: 4,
    ...overrides,
  };
}

describe("SaasAttributionService", () => {
  let db: SaasPostgresPort;
  let svc: SaasAttributionService;

  beforeEach(() => {
    resetSaasAttributionServiceForTests();
    db = { query: vi.fn() } as unknown as SaasPostgresPort;
    svc = new SaasAttributionService(db);
  });

  // ── trackEvent ─────────────────────────────────────────────────────────────
  describe("trackEvent", () => {
    it("inserts and returns the new event", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([makeEvent()]);
      const ev = await svc.trackEvent(TENANT, { utmSource: "google", utmMedium: "cpc", eventType: "visit" });
      expect(ev.utmSource).toBe("google");
      expect(ev.eventType).toBe("visit");
    });

    it("handles null utm fields gracefully", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([makeEvent({ utm_source: null, utm_medium: null })]);
      const ev = await svc.trackEvent(TENANT, { eventType: "visit" });
      expect(ev.utmSource).toBeNull();
    });

    it("handles form_submit event type", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([makeEvent({ event_type: "form_submit" })]);
      const ev = await svc.trackEvent(TENANT, { eventType: "form_submit" });
      expect(ev.eventType).toBe("form_submit");
    });

    it("handles conversion event type", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([makeEvent({ event_type: "conversion" })]);
      const ev = await svc.trackEvent(TENANT, { eventType: "conversion", contactId: CONTACT_ID });
      expect(ev.eventType).toBe("conversion");
      expect(ev.contactId).toBe(CONTACT_ID);
    });

    it("throws VALIDATION when DB insert fails", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([]);
      await expect(svc.trackEvent(TENANT, {})).rejects.toThrow(SaasAttributionError);
    });
  });

  // ── getChannelBreakdown ────────────────────────────────────────────────────
  describe("getChannelBreakdown", () => {
    it("returns channel rows mapped correctly", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([makeChannel()]);
      const channels = await svc.getChannelBreakdown(TENANT, 30);
      expect(channels).toHaveLength(1);
      expect(channels[0].utmSource).toBe("google");
      expect(channels[0].visits).toBe(120);
      expect(channels[0].conversions).toBe(3);
    });

    it("returns empty array when no data", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([]);
      expect(await svc.getChannelBreakdown(TENANT, 7)).toHaveLength(0);
    });

    it("maps null utm_medium to null in result", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([makeChannel({ utm_medium: null })]);
      const [ch] = await svc.getChannelBreakdown(TENANT, 30);
      expect(ch.utmMedium).toBeNull();
    });
  });

  // ── getCampaignBreakdown ───────────────────────────────────────────────────
  describe("getCampaignBreakdown", () => {
    it("returns campaign rows mapped correctly", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([makeCampaign()]);
      const campaigns = await svc.getCampaignBreakdown(TENANT, 30);
      expect(campaigns[0].utmCampaign).toBe("brand-2026");
      expect(campaigns[0].formSubmits).toBe(6);
    });

    it("returns empty array when no campaigns", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([]);
      expect(await svc.getCampaignBreakdown(TENANT, 30)).toHaveLength(0);
    });
  });

  // ── getContactJourney ──────────────────────────────────────────────────────
  describe("getContactJourney", () => {
    it("returns all events for contact ordered by time", async () => {
      const events = [
        makeEvent({ id: "ev-1", event_type: "visit" }),
        makeEvent({ id: "ev-2", event_type: "form_submit" }),
        makeEvent({ id: "ev-3", event_type: "conversion" }),
      ];
      vi.mocked(db.query).mockResolvedValueOnce(events);
      const journey = await svc.getContactJourney(TENANT, CONTACT_ID);
      expect(journey).toHaveLength(3);
      expect(journey[0].eventType).toBe("visit");
      expect(journey[2].eventType).toBe("conversion");
    });

    it("returns empty array for contact with no attribution", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([]);
      expect(await svc.getContactJourney(TENANT, CONTACT_ID)).toHaveLength(0);
    });
  });

  // ── getSummary ─────────────────────────────────────────────────────────────
  describe("getSummary", () => {
    it("returns aggregated summary with topSource", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([{ total_visits: 500, total_form_submits: 30, total_conversions: 10, total_contacts: 25 }]);
      vi.mocked(db.query).mockResolvedValueOnce([{ utm_source: "google" }]);
      const summary = await svc.getSummary(TENANT, 30);
      expect(summary.totalVisits).toBe(500);
      expect(summary.totalConversions).toBe(10);
      expect(summary.topSource).toBe("google");
    });

    it("returns null topSource when no attribution data", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([{ total_visits: 0, total_form_submits: 0, total_conversions: 0, total_contacts: 0 }]);
      vi.mocked(db.query).mockResolvedValueOnce([]);
      const summary = await svc.getSummary(TENANT, 30);
      expect(summary.topSource).toBeNull();
      expect(summary.totalVisits).toBe(0);
    });

    it("defaults to days=30 when not specified", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([{ total_visits: 10, total_form_submits: 0, total_conversions: 0, total_contacts: 0 }]);
      vi.mocked(db.query).mockResolvedValueOnce([]);
      const summary = await svc.getSummary(TENANT);
      expect(summary.totalVisits).toBe(10);
    });
  });
});
