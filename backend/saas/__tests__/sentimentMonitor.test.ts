// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SentimentMonitorService, resetSentimentMonitorServiceForTests } from "../SentimentMonitorService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";

describe("SentimentMonitorService", () => {
  beforeEach(() => {
    resetSentimentMonitorServiceForTests();
    vi.clearAllMocks();
  });

  it("analyzeSentiment positivo", async () => {
    const llm = {
      complete: vi.fn().mockResolvedValue(`{"score":0.8,"label":"positive","confidence":0.92,"topics":["support","quality"]}`),
    };
    const svc = new SentimentMonitorService({ db: { query: vi.fn() }, llm });
    const out = await svc.analyzeSentiment(USER_ID, "Excelente soporte y calidad", "web");
    expect(out.label).toBe("positive");
    expect(out.score).toBeGreaterThan(0.5);
  });

  it("analyzeSentiment negativo y neutro", async () => {
    const llmNeg = { complete: vi.fn().mockResolvedValue(`{"score":-0.7,"label":"negative","confidence":0.88,"topics":["delivery"]}`) };
    const svcNeg = new SentimentMonitorService({ db: { query: vi.fn() }, llm: llmNeg });
    const neg = await svcNeg.analyzeSentiment(USER_ID, "Muy mala experiencia", "email");
    expect(neg.label).toBe("negative");

    const llmNeu = { complete: vi.fn().mockResolvedValue(`{"score":0.05,"label":"neutral","confidence":0.7,"topics":[]}`) };
    const svcNeu = new SentimentMonitorService({ db: { query: vi.fn() }, llm: llmNeu });
    const neu = await svcNeu.analyzeSentiment(USER_ID, "Consulta de información", "web");
    expect(neu.label).toBe("neutral");
  });

  it("saveMention guarda score calculado", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: "m1",
        user_id: USER_ID,
        channel: "whatsapp",
        text: "hola",
        score: "0.4",
        label: "positive",
        confidence: "0.8",
        topics: ["support"],
        created_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const llm = { complete: vi.fn().mockResolvedValue(`{"score":0.4,"label":"positive","confidence":0.8,"topics":["support"]}`) };
    const svc = new SentimentMonitorService({ db: { query }, llm });
    const out = await svc.saveMention(USER_ID, "whatsapp", "hola", { source: "chat" });
    expect(out.label).toBe("positive");
    expect(String(query.mock.calls[0][0])).toContain("INSERT INTO sentiment_mentions");
  });

  it("getMentions paginadas", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ total: "1" }])
      .mockResolvedValueOnce([
        {
          id: "m1",
          user_id: USER_ID,
          channel: "web",
          text: "ok",
          score: "0.1",
          label: "neutral",
          confidence: "0.6",
          topics: [],
          created_at: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]);
    const svc = new SentimentMonitorService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getMentions(USER_ID, { page: 1, pageSize: 20 });
    expect(out.total).toBe(1);
    expect(out.items).toHaveLength(1);
  });

  it("getStats agrega distribución y tendencia", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ avg_score: "-0.12", total: "10" }])
      .mockResolvedValueOnce([{ channel: "web", total: "10", positive: "2", neutral: "3", negative: "5", avg_score: "-0.2" }])
      .mockResolvedValueOnce([{ date: "2026-05-01", avg_score: "-0.1" }]);
    const svc = new SentimentMonitorService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getStats(USER_ID, "30d");
    expect(out.totalMentions).toBe(10);
    expect(out.channels[0].channel).toBe("web");
    expect(out.trend).toHaveLength(1);
  });

  it("checkAlerts dispara y no dispara", async () => {
    const q1 = vi.fn().mockResolvedValueOnce([{ avg_score: "-0.5" }]).mockResolvedValueOnce([{ id: "a1" }]);
    const svc1 = new SentimentMonitorService({ db: { query: q1 }, llm: { complete: vi.fn() } });
    const trigger = await svc1.checkAlerts(USER_ID);
    expect(trigger.triggered).toBe(true);

    const q2 = vi.fn().mockResolvedValueOnce([{ avg_score: "-0.1" }]);
    const svc2 = new SentimentMonitorService({ db: { query: q2 }, llm: { complete: vi.fn() } });
    const noTrigger = await svc2.checkAlerts(USER_ID);
    expect(noTrigger.triggered).toBe(false);
  });
});
