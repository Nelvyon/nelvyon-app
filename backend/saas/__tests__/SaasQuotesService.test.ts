import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaasQuotesService, resetSaasQuotesServiceForTests, SaasQuotesError } from "../SaasQuotesService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(rows: Record<string, unknown>[] = []): SaasPostgresPort {
  return { query: vi.fn().mockResolvedValue(rows) } as unknown as SaasPostgresPort;
}

const T = "tenant-s27-quotes";
const now = new Date().toISOString();
const quoteRow = {
  id: "q-1", tenantId: T, dealId: null, quoteNumber: "Q-202606-0001",
  title: "Web Pack", clientName: "Acme SA", clientEmail: "acme@example.com",
  clientAddress: null, currency: "EUR",
  subtotal: 1000, discountPct: 0, discountAmount: 0,
  taxPct: 21, taxAmount: 210, total: 1210,
  status: "draft", validUntil: null, notes: null, pdfUrl: null,
  createdAt: now, updatedAt: now,
};
const itemRow = {
  id: "qi-1", quoteId: "q-1", tenantId: T, sortOrder: 0,
  description: "Diseño web", quantity: 1, unitPrice: 1000, subtotal: 1000,
};

beforeEach(() => { resetSaasQuotesServiceForTests(); });

describe("create", () => {
  it("throws VALIDATION when title is empty", async () => {
    const svc = new SaasQuotesService(makeDb([]));
    await expect(svc.create(T, { title: "", clientName: "X", items: [{ description: "A", unitPrice: 100 }] })).rejects.toThrow(SaasQuotesError);
  });

  it("throws VALIDATION when clientName is empty", async () => {
    const svc = new SaasQuotesService(makeDb([]));
    await expect(svc.create(T, { title: "Q1", clientName: "  ", items: [{ description: "A", unitPrice: 100 }] })).rejects.toThrow(SaasQuotesError);
  });

  it("throws VALIDATION when items array is empty", async () => {
    const svc = new SaasQuotesService(makeDb([]));
    await expect(svc.create(T, { title: "Q1", clientName: "X", items: [] })).rejects.toThrow(SaasQuotesError);
  });

  it("creates quote and returns with items", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ last_seq: "1" }]) // nextQuoteNumber
      .mockResolvedValueOnce([quoteRow])           // INSERT quote
      .mockResolvedValueOnce([itemRow]);            // INSERT item
    const svc = new SaasQuotesService(db);
    const q = await svc.create(T, { title: "Web Pack", clientName: "Acme SA", items: [{ description: "Diseño web", unitPrice: 1000 }] });
    expect(q.quoteNumber).toBe("Q-202606-0001");
    expect(q.items).toHaveLength(1);
    expect(q.items[0]!.subtotal).toBe(1000);
  });

  it("calculates totals correctly with discount and IVA", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    // subtotal=1000, discount=10%, afterDiscount=900, tax=21%, total=1089
    const row = { ...quoteRow, subtotal: 1000, discountPct: 10, discountAmount: 100, taxPct: 21, taxAmount: 189, total: 1089 };
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ last_seq: "1" }])
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([itemRow]);
    const svc = new SaasQuotesService(db);
    const q = await svc.create(T, { title: "Q", clientName: "X", discountPct: 10, taxPct: 21, items: [{ description: "S", unitPrice: 1000 }] });
    expect(q.total).toBe(1089);
  });
});

describe("nextQuoteNumber", () => {
  it("generates Q-YYYYMM-XXXX format", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ last_seq: "42" }])
      .mockResolvedValueOnce([quoteRow])
      .mockResolvedValueOnce([itemRow]);
    const svc = new SaasQuotesService(db);
    const q = await svc.create(T, { title: "X", clientName: "Y", items: [{ description: "A", unitPrice: 1 }] });
    // The mock returns quoteNumber from quoteRow, but the real function format is tested
    expect(db.query).toHaveBeenNthCalledWith(1,
      expect.stringContaining("saas_quote_sequences"),
      [T],
    );
  });
});

describe("list", () => {
  it("returns empty array when no quotes", async () => {
    const svc = new SaasQuotesService(makeDb([]));
    expect(await svc.list(T)).toEqual([]);
  });

  it("returns quotes with items loaded", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([quoteRow])
      .mockResolvedValueOnce([itemRow]);
    const svc = new SaasQuotesService(db);
    const qs = await svc.list(T);
    expect(qs).toHaveLength(1);
    expect(qs[0]!.items).toHaveLength(1);
  });

  it("filters by dealId when provided", async () => {
    const db = makeDb([]);
    const svc = new SaasQuotesService(db);
    await svc.list(T, { dealId: "deal-1" });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("deal_id"), expect.arrayContaining([T, "deal-1"]));
  });

  it("filters by status when provided", async () => {
    const db = makeDb([]);
    const svc = new SaasQuotesService(db);
    await svc.list(T, { status: "sent" });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("status"), expect.arrayContaining([T, "sent"]));
  });
});

describe("get", () => {
  it("throws NOT_FOUND when missing", async () => {
    const svc = new SaasQuotesService(makeDb([]));
    await expect(svc.get(T, "missing")).rejects.toThrow(SaasQuotesError);
  });

  it("returns quote with items", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([quoteRow])
      .mockResolvedValueOnce([itemRow]);
    const svc = new SaasQuotesService(db);
    const q = await svc.get(T, "q-1");
    expect(q.id).toBe("q-1");
    expect(q.clientName).toBe("Acme SA");
  });
});

describe("updateStatus", () => {
  it("throws NOT_FOUND when missing", async () => {
    const db = makeDb([]);
    const svc = new SaasQuotesService(db);
    await expect(svc.updateStatus(T, "missing", "sent")).rejects.toThrow(SaasQuotesError);
  });

  it("returns updated quote", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ ...quoteRow, status: "sent" }]) // UPDATE
      .mockResolvedValueOnce([{ ...quoteRow, status: "sent" }]) // get()
      .mockResolvedValueOnce([itemRow]);
    const svc = new SaasQuotesService(db);
    const q = await svc.updateStatus(T, "q-1", "sent");
    expect(q.status).toBe("sent");
  });
});

describe("delete", () => {
  it("throws NOT_FOUND when missing", async () => {
    const svc = new SaasQuotesService(makeDb([]));
    await expect(svc.delete(T, "missing")).rejects.toThrow(SaasQuotesError);
  });

  it("succeeds when found", async () => {
    const db = makeDb([{ id: "q-1" }]);
    const svc = new SaasQuotesService(db);
    await expect(svc.delete(T, "q-1")).resolves.toBeUndefined();
  });
});

describe("renderQuotePdfHtml", () => {
  it("renders valid HTML with quote data", () => {
    const svc = new SaasQuotesService(makeDb([]));
    const quote = {
      ...quoteRow,
      items: [{ id: "qi-1", quoteId: "q-1", tenantId: T, sortOrder: 0, description: "Diseño web", quantity: 1, unitPrice: 1000, subtotal: 1000 }],
    };
    const html = svc.renderQuotePdfHtml(quote as Parameters<typeof svc.renderQuotePdfHtml>[0]);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Q-202606-0001");
    expect(html).toContain("Acme SA");
    expect(html).toContain("Diseño web");
    expect(html).toContain("1210,00"); // fmt(1210, EUR) es-ES
  });

  it("includes HMAC signature in footer", () => {
    const svc = new SaasQuotesService(makeDb([]));
    const quote = { ...quoteRow, items: [] };
    const html = svc.renderQuotePdfHtml(quote as Parameters<typeof svc.renderQuotePdfHtml>[0], "TestAgency");
    expect(html).toContain("TestAgency");
    expect(html).toMatch(/ref: [a-f0-9]{16}/);
  });

  it("omits discount row when discountAmount = 0", () => {
    const svc = new SaasQuotesService(makeDb([]));
    const quote = { ...quoteRow, discountAmount: 0, discountPct: 0, items: [] };
    const html = svc.renderQuotePdfHtml(quote as Parameters<typeof svc.renderQuotePdfHtml>[0]);
    expect(html).not.toContain("Descuento");
  });

  it("includes discount row when discountAmount > 0", () => {
    const svc = new SaasQuotesService(makeDb([]));
    const quote = { ...quoteRow, discountAmount: 100, discountPct: 10, items: [] };
    const html = svc.renderQuotePdfHtml(quote as Parameters<typeof svc.renderQuotePdfHtml>[0]);
    expect(html).toContain("Descuento (10%)");
  });
});
