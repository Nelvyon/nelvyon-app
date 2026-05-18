import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const sendEmailMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("../../../email/emailService", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

import { FeedbackService } from "../../../feedback/FeedbackService";

describe("flow: NPS — trigger → submit → email agradecimiento", () => {
  beforeEach(() => {
    FeedbackService.reset();
    queryMock.mockReset();
    sendEmailMock.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-16T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shouldShowNps false si < 7 días desde registro", async () => {
    const threeDaysAgo = new Date("2026-05-13T12:00:00.000Z");
    const show = await FeedbackService.instance().shouldShowNps("user-1", threeDaysAgo);
    expect(show).toBe(false);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("shouldShowNps true si >= 7 días y sin respuesta previa", async () => {
    queryMock.mockResolvedValueOnce([{ count: "0" }]);
    const eightDaysAgo = new Date("2026-05-08T12:00:00.000Z");
    const show = await FeedbackService.instance().shouldShowNps("user-1", eightDaysAgo);
    expect(show).toBe(true);
  });

  it("submitNps score 9 → category promoter y email enviado", async () => {
    queryMock
      .mockResolvedValueOnce([{ id: "nps-1", category: "promoter" }])
      .mockResolvedValueOnce([{ email: "a@test.com", full_name: "Ana" }]);

    const out = await FeedbackService.instance().submitNps("user-1", 9, "Excelente");
    expect(out.category).toBe("promoter");

    await vi.runAllTimersAsync();
    expect(sendEmailMock).toHaveBeenCalledWith(
      "nps_thank_you",
      expect.objectContaining({ email: "a@test.com", score: "9" }),
    );
  });

  it("submitNps score 5 → category detractor", async () => {
    queryMock.mockResolvedValueOnce([{ id: "nps-2", category: "detractor" }]);
    const out = await FeedbackService.instance().submitNps("user-1", 5);
    expect(out.category).toBe("detractor");
  });

  it("submitNps duplicado: ON CONFLICT devuelve registro existente", async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "nps-existing", category: "promoter" }]);

    const out = await FeedbackService.instance().submitNps("user-1", 10);
    expect(out.id).toBe("nps-existing");
    expect(String(queryMock.mock.calls[0]![0])).toContain("ON CONFLICT");
  });

  it("submitFeedback devuelve id", async () => {
    queryMock.mockResolvedValueOnce([{ id: "fb-flow-1" }]);
    const out = await FeedbackService.instance().submitFeedback("user-1", {
      type: "feature",
      title: "Mejora",
      body: "Detalle",
    });
    expect(out.id).toBe("fb-flow-1");
  });
});
