// @ts-nocheck
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../integrations/GoogleAdsService", () => ({
  getGoogleAdsService: vi.fn(),
}));
vi.mock("../../integrations/MetaAdsService", () => ({
  getMetaAdsService: vi.fn(),
}));
vi.mock("../../integrations/WhatsAppService", () => ({
  getWhatsAppService: vi.fn(),
}));
vi.mock("../../integrations/TelegramService", () => ({
  getTelegramService: vi.fn(),
}));

import { getGoogleAdsService } from "../../integrations/GoogleAdsService";
import { getMetaAdsService } from "../../integrations/MetaAdsService";
import { getTelegramService } from "../../integrations/TelegramService";
import { getWhatsAppService } from "../../integrations/WhatsAppService";
import { ClosedLoopRoiService, resetClosedLoopRoiServiceForTests } from "../ClosedLoopRoiService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const SESSION_ID = "00000000-0000-0000-0000-0000000000bb";

describe("ClosedLoopRoiService", () => {
  beforeEach(() => {
    resetClosedLoopRoiServiceForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetClosedLoopRoiServiceForTests();
  });

  it("trackEvent", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "e1",
        userId: USER_ID,
        sessionId: SESSION_ID,
        eventType: "ad_click",
        channel: "google_ads",
        source: "search",
        metadata: { a: 1 },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const service = new ClosedLoopRoiService({
      db: { query },
      googleAdsService: { getAccountSummary: vi.fn() },
      metaAdsService: { getAccountSummary: vi.fn(), sendConversionEvent: vi.fn() },
      whatsAppService: { sendTemplateMessage: vi.fn() },
      telegramService: { sendMessage: vi.fn() },
    });
    const event = await service.trackEvent(USER_ID, SESSION_ID, "ad_click", "google_ads", "search", { a: 1 });
    expect(event.eventType).toBe("ad_click");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO roi_events"), expect.any(Array));
  });

  it("trackConversion con feedback google", async () => {
    const reportConversion = vi.fn().mockResolvedValue(undefined);
    const googleMock = { getAccountSummary: vi.fn().mockResolvedValue({ totalSpend: 10 }), reportConversion };
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "c1",
          userId: USER_ID,
          sessionId: SESSION_ID,
          revenue: "100.00",
          conversionType: "purchase",
          attributedChannel: "google_ads",
          attributedSource: "search",
          metadata: {},
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]);
    const service = new ClosedLoopRoiService({
      db: { query },
      googleAdsService: googleMock,
      metaAdsService: { getAccountSummary: vi.fn(), sendConversionEvent: vi.fn() },
      whatsAppService: { sendTemplateMessage: vi.fn() },
      telegramService: { sendMessage: vi.fn() },
    });
    const out = await service.trackConversion(USER_ID, SESSION_ID, 100, "purchase", "google_ads", "search", {});
    expect(out.revenue).toBe(100);
    expect(reportConversion).toHaveBeenCalledTimes(1);
  });

  it("trackConversion con feedback meta", async () => {
    const sendConversionEvent = vi.fn().mockResolvedValue({ eventId: "m1" });
    const metaMock = { getAccountSummary: vi.fn().mockResolvedValue({ totalSpend: 20 }), sendConversionEvent };
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: "c2",
        userId: USER_ID,
        sessionId: SESSION_ID,
        revenue: "35.50",
        conversionType: "lead",
        attributedChannel: "meta_ads",
        attributedSource: "fb",
        metadata: { k: "v" },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const service = new ClosedLoopRoiService({
      db: { query },
      googleAdsService: { getAccountSummary: vi.fn().mockResolvedValue({ totalSpend: 0 }) },
      metaAdsService: metaMock,
      whatsAppService: { sendTemplateMessage: vi.fn() },
      telegramService: { sendMessage: vi.fn() },
    });
    await service.trackConversion(USER_ID, SESSION_ID, 35.5, "lead", "meta_ads", "fb", { k: "v" });
    expect(sendConversionEvent).toHaveBeenCalledTimes(1);
  });

  it("startNurturingSequence whatsapp", async () => {
    const sendTemplateMessage = vi.fn().mockResolvedValue({ messageId: "wamid" });
    const query = vi.fn().mockResolvedValue([
      {
        id: "e2",
        userId: USER_ID,
        sessionId: SESSION_ID,
        eventType: "nurturing_sent",
        channel: "whatsapp",
        source: "closed_loop_roi",
        metadata: {},
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const service = new ClosedLoopRoiService({
      db: { query },
      googleAdsService: { getAccountSummary: vi.fn() },
      metaAdsService: { getAccountSummary: vi.fn(), sendConversionEvent: vi.fn() },
      whatsAppService: { sendTemplateMessage },
      telegramService: { sendMessage: vi.fn() },
    });
    await service.startNurturingSequence(USER_ID, SESSION_ID, { recipient: "+34111111111" }, "whatsapp");
    expect(sendTemplateMessage).toHaveBeenCalledTimes(1);
  });

  it("startNurturingSequence telegram", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ messageId: 1 });
    const query = vi.fn().mockResolvedValue([
      {
        id: "e3",
        userId: USER_ID,
        sessionId: SESSION_ID,
        eventType: "nurturing_sent",
        channel: "telegram",
        source: "closed_loop_roi",
        metadata: {},
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const service = new ClosedLoopRoiService({
      db: { query },
      googleAdsService: { getAccountSummary: vi.fn() },
      metaAdsService: { getAccountSummary: vi.fn(), sendConversionEvent: vi.fn() },
      whatsAppService: { sendTemplateMessage: vi.fn() },
      telegramService: { sendMessage },
    });
    await service.startNurturingSequence(USER_ID, SESSION_ID, { text: "hola", chatId: "123" }, "telegram");
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("getRoiMetrics", async () => {
    const query = vi.fn().mockResolvedValue([{ total_revenue: "250.00", conversions: "5" }]);
    const service = new ClosedLoopRoiService({
      db: { query },
      googleAdsService: { getAccountSummary: vi.fn().mockResolvedValue({ totalSpend: 100 }) },
      metaAdsService: { getAccountSummary: vi.fn().mockResolvedValue({ totalSpend: 50 }), sendConversionEvent: vi.fn() },
      whatsAppService: { sendTemplateMessage: vi.fn() },
      telegramService: { sendMessage: vi.fn() },
    });
    const out = await service.getRoiMetrics(USER_ID);
    expect(out.totalSpend).toBe(150);
    expect(out.totalRevenue).toBe(250);
    expect(out.conversions).toBe(5);
  });

  it("getSessionJourney", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "e4",
        userId: USER_ID,
        sessionId: SESSION_ID,
        eventType: "ad_click",
        channel: "meta_ads",
        source: "ig",
        metadata: {},
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const service = new ClosedLoopRoiService({
      db: { query },
      googleAdsService: { getAccountSummary: vi.fn() },
      metaAdsService: { getAccountSummary: vi.fn(), sendConversionEvent: vi.fn() },
      whatsAppService: { sendTemplateMessage: vi.fn() },
      telegramService: { sendMessage: vi.fn() },
    });
    const events = await service.getSessionJourney(USER_ID, SESSION_ID);
    expect(events).toHaveLength(1);
    expect(String(query.mock.calls[0][0])).toContain("ORDER BY created_at ASC");
  });

  it("createLoop", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "l1",
        userId: USER_ID,
        status: "active",
        totalSpend: "0",
        totalRevenue: "0",
        roiPercentage: "0",
        loopStart: new Date("2026-01-01T00:00:00.000Z"),
        loopEnd: null,
        metadata: { source: "closed_loop_roi" },
      },
    ]);
    const service = new ClosedLoopRoiService({
      db: { query },
      googleAdsService: { getAccountSummary: vi.fn() },
      metaAdsService: { getAccountSummary: vi.fn(), sendConversionEvent: vi.fn() },
      whatsAppService: { sendTemplateMessage: vi.fn() },
      telegramService: { sendMessage: vi.fn() },
    });
    const loop = await service.createLoop(USER_ID);
    expect(loop.status).toBe("active");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO roi_loops"), [USER_ID, expect.any(String)]);
  });

  it("closeLoop", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ total_revenue: "300.00", conversions: "3" }])
      .mockResolvedValueOnce([
        {
          id: "l2",
          userId: USER_ID,
          status: "closed",
          totalSpend: "150",
          totalRevenue: "300",
          roiPercentage: "100",
          loopStart: new Date("2026-01-01T00:00:00.000Z"),
          loopEnd: new Date("2026-01-31T00:00:00.000Z"),
          metadata: {},
        },
      ]);
    const service = new ClosedLoopRoiService({
      db: { query },
      googleAdsService: { getAccountSummary: vi.fn().mockResolvedValue({ totalSpend: 100 }) },
      metaAdsService: { getAccountSummary: vi.fn().mockResolvedValue({ totalSpend: 50 }), sendConversionEvent: vi.fn() },
      whatsAppService: { sendTemplateMessage: vi.fn() },
      telegramService: { sendMessage: vi.fn() },
    });
    const loop = await service.closeLoop("00000000-0000-0000-0000-0000000000cc", USER_ID);
    expect(loop.status).toBe("closed");
    expect(loop.roiPercentage).toBe(100);
  });

  it("usa servicios mockeados con vi.mock", async () => {
    const query = vi.fn().mockResolvedValue([{ total_revenue: "0", conversions: "0" }]);
    const googleSummary = vi.fn().mockResolvedValue({ totalSpend: 0 });
    const metaSummary = vi.fn().mockResolvedValue({ totalSpend: 0 });
    vi.mocked(getGoogleAdsService).mockReturnValue({ getAccountSummary: googleSummary } as never);
    vi.mocked(getMetaAdsService).mockReturnValue({ getAccountSummary: metaSummary, sendConversionEvent: vi.fn() } as never);
    vi.mocked(getWhatsAppService).mockReturnValue({ sendTemplateMessage: vi.fn() } as never);
    vi.mocked(getTelegramService).mockReturnValue({ sendMessage: vi.fn() } as never);

    const service = new ClosedLoopRoiService({ db: { query } });
    await service.getRoiMetrics(USER_ID);
    expect(googleSummary).toHaveBeenCalledTimes(1);
    expect(metaSummary).toHaveBeenCalledTimes(1);
  });
});
