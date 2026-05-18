import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const completeMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({ complete: completeMock }),
  },
}));

import { AbAgentService } from "../ab-testing/AbAgentService";
import { AbTestingService } from "../ab-testing/AbTestingService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const EXP_ID = "11111111-1111-1111-1111-111111111111";
const V1 = "22222222-2222-2222-2222-222222222221";
const V2 = "22222222-2222-2222-2222-222222222222";

describe("Ab testing service", () => {
  beforeEach(() => {
    queryMock.mockReset();
    completeMock.mockReset();
  });

  it("createExperiment inserta experimento y variantes", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: EXP_ID,
          user_id: USER_ID,
          name: "Subject test",
          channel: "email",
          status: "running",
          winner_variant: null,
          confidence_threshold: 0.95,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: V1,
          experiment_id: EXP_ID,
          name: "A",
          content: "copy a",
          impressions: 0,
          clicks: 0,
          conversions: 0,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: V2,
          experiment_id: EXP_ID,
          name: "B",
          content: "copy b",
          impressions: 0,
          clicks: 0,
          conversions: 0,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ]);

    const exp = await AbTestingService.createExperiment(USER_ID, "Subject test", "email", [
      { name: "A", content: "copy a" },
      { name: "B", content: "copy b" },
    ]);
    expect(exp.id).toBe(EXP_ID);
    expect(exp.variants?.length).toBe(2);
    expect(queryMock).toHaveBeenCalledTimes(4);
  });

  it("recordEvent incrementa contador correcto", async () => {
    queryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await AbTestingService.recordEvent(V1, "conversion");
    const sql = String(queryMock.mock.calls[0][0]);
    expect(sql).toContain("conversions = conversions + 1");
  });

  it("detectWinner detecta ganador con datos claros", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: EXP_ID,
          user_id: USER_ID,
          name: "x",
          channel: "email",
          status: "running",
          winner_variant: null,
          confidence_threshold: 0.95,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: V1,
          experiment_id: EXP_ID,
          name: "A",
          content: "a",
          impressions: 1000,
          clicks: 120,
          conversions: 240,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: V2,
          experiment_id: EXP_ID,
          name: "B",
          content: "b",
          impressions: 1000,
          clicks: 110,
          conversions: 120,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([]);
    const winner = await AbTestingService.detectWinner(EXP_ID);
    expect(winner).toBe(V1);
  });

  it("detectWinner devuelve null si no hay diferencia", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: EXP_ID,
          user_id: USER_ID,
          name: "x",
          channel: "email",
          status: "running",
          winner_variant: null,
          confidence_threshold: 0.95,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: V1,
          experiment_id: EXP_ID,
          name: "A",
          content: "a",
          impressions: 100,
          clicks: 20,
          conversions: 10,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: V2,
          experiment_id: EXP_ID,
          name: "B",
          content: "b",
          impressions: 100,
          clicks: 21,
          conversions: 9,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ]);
    const winner = await AbTestingService.detectWinner(EXP_ID);
    expect(winner).toBeNull();
  });

  it("generateVariants llama LLM y crea experimento", async () => {
    completeMock.mockResolvedValueOnce(JSON.stringify({ variants: ["Asunto A", "Asunto B"] }));
    queryMock
      .mockResolvedValueOnce([
        {
          id: EXP_ID,
          user_id: USER_ID,
          name: "Exp",
          channel: "email",
          status: "running",
          winner_variant: null,
          confidence_threshold: 0.95,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: V1,
          experiment_id: EXP_ID,
          name: "A",
          content: "Asunto A",
          impressions: 0,
          clicks: 0,
          conversions: 0,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: V2,
          experiment_id: EXP_ID,
          name: "B",
          content: "Asunto B",
          impressions: 0,
          clicks: 0,
          conversions: 0,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ]);

    const svc = new AbAgentService();
    const exp = await svc.generateVariants(USER_ID, "email", "base", 2, "Exp");
    expect(exp.id).toBe(EXP_ID);
    expect(completeMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ model: "gpt-4o", maxTokens: 2000, temperature: 0.7 }),
    );
  });
});
