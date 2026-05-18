import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("../../email/emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendEmail } from "../../email/emailService";
import { FeedbackService } from "../FeedbackService";

describe("FeedbackService", () => {
  beforeEach(() => {
    FeedbackService.reset();
    queryMock.mockReset();
    vi.mocked(sendEmail).mockClear();
  });

  it("submitNps score 9 devuelve category promoter", async () => {
    queryMock
      .mockResolvedValueOnce([{ id: "nps-1", category: "promoter" }])
      .mockResolvedValueOnce([{ email: "a@test.com", full_name: "Ana" }]);
    const svc = FeedbackService.instance();
    const out = await svc.submitNps("user-1", 9);
    expect(out.category).toBe("promoter");
    expect(out.id).toBe("nps-1");
    await new Promise((r) => setTimeout(r, 0));
    expect(sendEmail).toHaveBeenCalledWith(
      "nps_thank_you",
      expect.objectContaining({ email: "a@test.com", score: "9" }),
    );
  });

  it("submitNps score 11 lanza Error", async () => {
    const svc = FeedbackService.instance();
    await expect(svc.submitNps("user-1", 11)).rejects.toThrow(/0 and 10/);
  });

  it("shouldShowNps usuario registrado hace 3 días → false", async () => {
    const svc = FeedbackService.instance();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const show = await svc.shouldShowNps("user-1", threeDaysAgo);
    expect(show).toBe(false);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("shouldShowNps usuario 8 días sin respuesta previa → true", async () => {
    queryMock.mockResolvedValueOnce([{ count: "0" }]);
    const svc = FeedbackService.instance();
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const show = await svc.shouldShowNps("user-1", eightDaysAgo);
    expect(show).toBe(true);
  });

  it("shouldShowNps usuario ya respondió → false", async () => {
    queryMock.mockResolvedValueOnce([{ count: "1" }]);
    const svc = FeedbackService.instance();
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const show = await svc.shouldShowNps("user-1", eightDaysAgo);
    expect(show).toBe(false);
  });

  it("submitFeedback tipo válido devuelve id", async () => {
    queryMock.mockResolvedValueOnce([{ id: "fb-1" }]);
    const svc = FeedbackService.instance();
    const out = await svc.submitFeedback("user-1", {
      type: "bug",
      title: "Error",
      body: "Detalle",
    });
    expect(out.id).toBe("fb-1");
  });

  it("submitFeedback tipo inválido lanza Error", async () => {
    const svc = FeedbackService.instance();
    await expect(
      svc.submitFeedback("user-1", { type: "invalid", title: "x", body: "y" }),
    ).rejects.toThrow(/Invalid feedback type/);
  });
});
