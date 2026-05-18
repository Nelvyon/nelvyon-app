// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: vi.fn(),
  },
}));
vi.mock("../../integrations/GoogleAdsService", () => ({
  getGoogleAdsService: vi.fn(),
}));
vi.mock("../../integrations/MetaAdsService", () => ({
  getMetaAdsService: vi.fn(),
}));
vi.mock("../../integrations/WhatsAppService", () => ({
  getWhatsAppService: vi.fn(),
}));

import { getGoogleAdsService } from "../../integrations/GoogleAdsService";
import { getMetaAdsService } from "../../integrations/MetaAdsService";
import { getWhatsAppService } from "../../integrations/WhatsAppService";
import { LlmClient } from "../LlmClient";
import { IntentMulticanalService, resetIntentMulticanalServiceForTests } from "../IntentMulticanalService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const SIGNAL_ID = "00000000-0000-0000-0000-0000000000bb";

describe("IntentMulticanalService", () => {
  beforeEach(() => {
    resetIntentMulticanalServiceForTests();
    vi.clearAllMocks();
  });

  it("detectIntent high", async () => {
    const llm = { complete: vi.fn().mockResolvedValue('{"score":88,"reasoning":"Alta intención por señales de compra"}') };
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    const svc = new IntentMulticanalService({ db: { query: vi.fn() } });
    const out = await svc.detectIntent(USER_ID, { contactId: "c1" }, ["visitó pricing", "pidió demo"]);
    expect(out.intentLevel).toBe("high");
    expect(llm.complete).toHaveBeenCalledWith(expect.any(String), { model: "gpt-4o", temperature: 0.2, maxTokens: 500 });
  });

  it("detectIntent low", async () => {
    const llm = { complete: vi.fn().mockResolvedValue('{"score":10,"reasoning":"Baja actividad"}') };
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    const svc = new IntentMulticanalService({ db: { query: vi.fn() } });
    const out = await svc.detectIntent(USER_ID, { contactId: "c1" }, ["visitó home"]);
    expect(out.intentLevel).toBe("low");
  });

  it("triggerMulticanalResponse con todos los canales", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const google = { getCredentials: vi.fn().mockResolvedValue({ ok: true }) };
    const meta = {
      getCredentials: vi.fn().mockResolvedValue({ ok: true }),
      sendConversionEvent: vi.fn().mockResolvedValue({ eventId: "m1" }),
    };
    const wa = {
      getCredentials: vi.fn().mockResolvedValue({ ok: true }),
      sendTextMessage: vi.fn().mockResolvedValue({ messageId: "w1" }),
    };
    const svc = new IntentMulticanalService({ db: { query }, googleAdsService: google, metaAdsService: meta, whatsAppService: wa, llm: { complete: vi.fn() } });
    const out = await svc.triggerMulticanalResponse(
      USER_ID,
      { contactId: "c1", phone: "+34111111111", signalId: SIGNAL_ID } as never,
      { score: 90, intentLevel: "high", reasoning: "x" },
    );
    expect(out.triggered).toEqual(expect.arrayContaining(["email", "google_ads", "meta_ads", "whatsapp", "crm"]));
    expect(meta.sendConversionEvent).toHaveBeenCalledTimes(1);
  });

  it("triggerMulticanalResponse sin credenciales", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new IntentMulticanalService({
      db: { query },
      googleAdsService: { getCredentials: vi.fn().mockResolvedValue(null) },
      metaAdsService: { getCredentials: vi.fn().mockResolvedValue(null), sendConversionEvent: vi.fn() },
      whatsAppService: { getCredentials: vi.fn().mockResolvedValue(null), sendTextMessage: vi.fn() },
      llm: { complete: vi.fn() },
    });
    const out = await svc.triggerMulticanalResponse(
      USER_ID,
      { contactId: "c1", signalId: SIGNAL_ID } as never,
      { score: 80, intentLevel: "high", reasoning: "x" },
    );
    expect(out.skipped).toEqual(expect.arrayContaining(["google_ads", "meta_ads", "whatsapp"]));
  });

  it("processSignal high intent", async () => {
    const llm = { complete: vi.fn().mockResolvedValue('{"score":75,"reasoning":"listo"}') };
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: SIGNAL_ID,
          userId: USER_ID,
          contactId: "c1",
          signalType: "pricing_visit",
          channel: "web",
          score: 75,
          metadata: {},
          detectedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ])
      .mockResolvedValue([]);
    const svc = new IntentMulticanalService({
      db: { query },
      googleAdsService: { getCredentials: vi.fn().mockResolvedValue(null) },
      metaAdsService: { getCredentials: vi.fn().mockResolvedValue(null), sendConversionEvent: vi.fn() },
      whatsAppService: { getCredentials: vi.fn().mockResolvedValue(null), sendTextMessage: vi.fn() },
    });
    const signal = await svc.processSignal(USER_ID, "c1", "pricing_visit", "web", { behaviorSignals: ["visitó pricing"] });
    expect(signal.score).toBe(75);
  });

  it("processSignal low intent", async () => {
    const llm = { complete: vi.fn().mockResolvedValue('{"score":20,"reasoning":"bajo"}') };
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: SIGNAL_ID,
        userId: USER_ID,
        contactId: "c1",
        signalType: "blog_read",
        channel: "web",
        score: 20,
        metadata: {},
        detectedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new IntentMulticanalService({ db: { query } });
    const signal = await svc.processSignal(USER_ID, "c1", "blog_read", "web", { behaviorSignals: ["leyó blog"] });
    expect(signal.score).toBe(20);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("getIntentHistory", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: SIGNAL_ID,
        userId: USER_ID,
        contactId: "c1",
        signalType: "x",
        channel: "web",
        score: 50,
        metadata: {},
        detectedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new IntentMulticanalService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getIntentHistory(USER_ID, "c1");
    expect(out).toHaveLength(1);
    expect(String(query.mock.calls[0][0])).toContain("WHERE user_id = $1::uuid AND contact_id = $2");
  });

  it("getActionHistory", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "a1",
        userId: USER_ID,
        signalId: SIGNAL_ID,
        actionType: "retargeting",
        channel: "meta_ads",
        status: "executed",
        executedAt: new Date("2026-01-01T00:00:00.000Z"),
        metadata: {},
      },
    ]);
    const svc = new IntentMulticanalService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getActionHistory(USER_ID, SIGNAL_ID);
    expect(out).toHaveLength(1);
    expect(String(query.mock.calls[0][0])).toContain("signal_id = $2::uuid");
  });

  it("getIntentSummary", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ total_signals: "10", high_intent_count: "4" }])
      .mockResolvedValueOnce([{ actions_triggered: "12" }]);
    const svc = new IntentMulticanalService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getIntentSummary(USER_ID);
    expect(out.totalSignals).toBe(10);
    expect(out.highIntentCount).toBe(4);
    expect(out.actionsTriggered).toBe(12);
    expect(out.conversionRate).toBe(40);
  });

  it("usa servicios externos mockeados con vi.mock", async () => {
    const googleCred = vi.fn().mockResolvedValue(null);
    const metaCred = vi.fn().mockResolvedValue(null);
    const waCred = vi.fn().mockResolvedValue(null);
    vi.mocked(getGoogleAdsService).mockReturnValue({ getCredentials: googleCred } as never);
    vi.mocked(getMetaAdsService).mockReturnValue({ getCredentials: metaCred, sendConversionEvent: vi.fn() } as never);
    vi.mocked(getWhatsAppService).mockReturnValue({ getCredentials: waCred, sendTextMessage: vi.fn() } as never);

    const svc = new IntentMulticanalService({ db: { query: vi.fn().mockResolvedValue([]) }, llm: { complete: vi.fn() } });
    await svc.triggerMulticanalResponse(
      USER_ID,
      { contactId: "c1", signalId: SIGNAL_ID } as never,
      { score: 72, intentLevel: "high", reasoning: "x" },
    );
    expect(googleCred).toHaveBeenCalledTimes(1);
    expect(metaCred).toHaveBeenCalledTimes(1);
    expect(waCred).toHaveBeenCalledTimes(1);
  });
});
