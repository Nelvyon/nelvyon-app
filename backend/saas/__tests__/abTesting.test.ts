// @ts-nocheck
import { describe, expect, it, vi } from "vitest";

import { ABTestingService } from "../ABTestingService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const TEST_ID = "00000000-0000-0000-0000-0000000000bb";
const V1 = "00000000-0000-0000-0000-0000000000c1";
const V2 = "00000000-0000-0000-0000-0000000000c2";

describe("ABTestingService", () => {
  it("createTest crea test y variantes", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: TEST_ID,
          user_id: USER_ID,
          name: "Test asunto",
          metric: "conversions",
          duration_days: 7,
          status: "running",
          winner_variant_id: null,
          created_at: new Date("2026-01-01T00:00:00.000Z"),
          updated_at: new Date("2026-01-01T00:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: TEST_ID,
          user_id: USER_ID,
          name: "Test asunto",
          metric: "conversions",
          duration_days: 7,
          status: "running",
          winner_variant_id: null,
          created_at: new Date("2026-01-01T00:00:00.000Z"),
          updated_at: new Date("2026-01-01T00:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        { id: V1, name: "A", content: "copy a", status: "running", clicks: "0", conversions: "0", opens: "0" },
        { id: V2, name: "B", content: "copy b", status: "running", clicks: "0", conversions: "0", opens: "0" },
      ]);
    const svc = new ABTestingService({ db: { query } });
    const out = await svc.createTest(USER_ID, {
      name: "Test asunto",
      metric: "conversions",
      duration_days: 7,
      variants: [
        { name: "A", content: "copy a" },
        { name: "B", content: "copy b" },
      ],
    });
    expect(out.id).toBe(TEST_ID);
    expect(out.variants).toHaveLength(2);
  });

  it("getTest retorna estado con métricas por variante", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: TEST_ID,
          user_id: USER_ID,
          name: "Test",
          metric: "conversions",
          duration_days: 5,
          status: "running",
          winner_variant_id: null,
          created_at: new Date("2026-01-01T00:00:00.000Z"),
          updated_at: new Date("2026-01-01T00:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        { id: V1, name: "A", content: "a", status: "running", clicks: "20", conversions: "8", opens: "40" },
        { id: V2, name: "B", content: "b", status: "running", clicks: "18", conversions: "6", opens: "42" },
      ]);
    const svc = new ABTestingService({ db: { query } });
    const out = await svc.getTest(TEST_ID);
    expect(out?.variants[0].conversionRate).toBe(20);
  });

  it("recordResult inserta resultados", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new ABTestingService({ db: { query } });
    await svc.recordResult(TEST_ID, V1, "clicks", 15);
    expect(String(query.mock.calls[0][0])).toContain("INSERT INTO ab_test_results");
  });

  it("evaluateWinner devuelve ganadora si supera 20%", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: TEST_ID,
          user_id: USER_ID,
          name: "Test",
          metric: "conversions",
          duration_days: 7,
          status: "running",
          winner_variant_id: null,
          created_at: new Date("2026-01-01T00:00:00.000Z"),
          updated_at: new Date("2026-01-01T00:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        { id: V1, name: "A", content: "a", status: "running", clicks: "10", conversions: "60", opens: "100" },
        { id: V2, name: "B", content: "b", status: "running", clicks: "10", conversions: "40", opens: "100" },
      ]);
    const svc = new ABTestingService({ db: { query } });
    const out = await svc.evaluateWinner(TEST_ID);
    expect(out.winnerVariantId).toBe(V1);
  });

  it("applyWinner marca winner y pausa el resto", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: TEST_ID,
          user_id: USER_ID,
          name: "Test",
          metric: "conversions",
          duration_days: 7,
          status: "running",
          winner_variant_id: null,
          created_at: new Date("2026-01-01T00:00:00.000Z"),
          updated_at: new Date("2026-01-01T00:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        { id: V1, name: "A", content: "a", status: "running", clicks: "10", conversions: "60", opens: "100" },
        { id: V2, name: "B", content: "b", status: "running", clicks: "10", conversions: "30", opens: "100" },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const svc = new ABTestingService({ db: { query } });
    const out = await svc.applyWinner(TEST_ID);
    expect(out.status).toBe("winner_selected");
    expect(String(query.mock.calls[2][0])).toContain("UPDATE ab_test_variants");
  });
});
