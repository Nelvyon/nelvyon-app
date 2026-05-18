import { describe, expect, it, vi } from "vitest";

import { SaasInvoiceService, saasInvoiceService, type Invoice } from "../SaasInvoiceService";

const invoiceRow = (over: Partial<Invoice> = {}): Invoice => ({
  id: "00000000-0000-0000-0000-000000000001",
  userId: "u1",
  tenantId: "t1",
  invoiceNumber: "NEL-2026-000001",
  periodStart: "2026-05-01T00:00:00.000Z",
  periodEnd: "2026-05-31T23:59:59.000Z",
  amountEur: 194,
  status: "issued",
  lineItems: [
    { description: "Servicio seo premium — pro", quantity: 1, unitPrice: 97, total: 97 },
    { description: "Servicio ads premium — pro", quantity: 1, unitPrice: 97, total: 97 },
  ],
  pdfUrl: null,
  issuedAt: "2026-06-01T00:00:00.000Z",
  paidAt: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  ...over,
});

describe("SaasInvoiceService", () => {
  it("generateMonthlyInvoice crea factura con número único NEL-YYYY-XXXXXX", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ service_id: "seo_premium", plan: "pro", amount_eur: 97 }])
      .mockResolvedValueOnce([{ count: "1" }])
      .mockResolvedValueOnce([invoiceRow({ invoiceNumber: "NEL-2026-000002" })]);
    const svc = new SaasInvoiceService({ db: { query } });
    const out = await svc.generateMonthlyInvoice("u1", "00000000-0000-0000-0000-0000000000aa", new Date("2026-05-01"), new Date("2026-05-31"));
    expect(out.invoiceNumber).toMatch(/^NEL-\d{4}-\d{6}$/);
  });

  it("generateMonthlyInvoice calcula amountEur sumando lineItems", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        { service_id: "seo_premium", plan: "pro", amount_eur: 120 },
        { service_id: "ads_premium", plan: "pro", amount_eur: 80 },
      ])
      .mockResolvedValueOnce([{ count: "0" }])
      .mockResolvedValueOnce([invoiceRow({ amountEur: 200 })]);
    const svc = new SaasInvoiceService({ db: { query } });
    await svc.generateMonthlyInvoice("u1", "00000000-0000-0000-0000-0000000000aa", new Date("2026-05-01"), new Date("2026-05-31"));
    const params = query.mock.calls[2]?.[1] as unknown[];
    expect(params?.[5]).toBe(200);
  });

  it("generateMonthlyInvoice con 0 contratos usa 97€ por defecto", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ count: "0" }]).mockResolvedValueOnce([invoiceRow({ amountEur: 97, lineItems: [] })]);
    const svc = new SaasInvoiceService({ db: { query } });
    const out = await svc.generateMonthlyInvoice("u1", "00000000-0000-0000-0000-0000000000aa", new Date("2026-05-01"), new Date("2026-05-31"));
    expect(out.amountEur).toBe(97);
  });

  it("generateMonthlyInvoice genera lineItems correctos por cada contrato", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        { service_id: "seo_premium", plan: "pro", amount_eur: 100 },
        { service_id: "ads_premium", plan: "enterprise", amount_eur: 150 },
      ])
      .mockResolvedValueOnce([{ count: "0" }])
      .mockResolvedValueOnce([invoiceRow()]);
    const svc = new SaasInvoiceService({ db: { query } });
    await svc.generateMonthlyInvoice("u1", "00000000-0000-0000-0000-0000000000aa", new Date("2026-05-01"), new Date("2026-05-31"));
    const lineItemsJson = String((query.mock.calls[2]?.[1] as unknown[])?.[6] ?? "");
    expect(lineItemsJson).toContain("seo premium");
    expect(lineItemsJson).toContain("enterprise");
  });

  it("getInvoices devuelve facturas ordenadas DESC", async () => {
    const query = vi.fn().mockResolvedValue([invoiceRow()]);
    const svc = new SaasInvoiceService({ db: { query } });
    await svc.getInvoices("u1", "t1");
    expect(String(query.mock.calls[0]?.[0])).toContain("ORDER BY created_at DESC");
  });

  it("getInvoices no devuelve facturas de otro usuario", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasInvoiceService({ db: { query } });
    const out = await svc.getInvoices("otro", "t1");
    expect(out).toEqual([]);
    expect(query.mock.calls[0]?.[1]).toEqual(["otro", "t1"]);
  });

  it("getInvoiceById devuelve factura correcta", async () => {
    const query = vi.fn().mockResolvedValue([invoiceRow()]);
    const svc = new SaasInvoiceService({ db: { query } });
    const out = await svc.getInvoiceById("00000000-0000-0000-0000-000000000001", "u1");
    expect(out?.id).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("getInvoiceById con id de otro usuario devuelve null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasInvoiceService({ db: { query } });
    expect(await svc.getInvoiceById("00000000-0000-0000-0000-000000000001", "u2")).toBeNull();
  });

  it("markAsPaid actualiza status a 'paid' y devuelve true", async () => {
    const query = vi.fn().mockResolvedValue([{ id: "x" }]);
    const svc = new SaasInvoiceService({ db: { query } });
    expect(await svc.markAsPaid("00000000-0000-0000-0000-000000000001")).toBe(true);
  });

  it("markAsPaid en factura ya pagada devuelve false", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasInvoiceService({ db: { query } });
    expect(await svc.markAsPaid("00000000-0000-0000-0000-000000000001")).toBe(false);
  });

  it("generateMonthlyInvoice usa fallback 97 cuando amount_eur null", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ service_id: "seo_premium", plan: "pro", amount_eur: null }])
      .mockResolvedValueOnce([{ count: "0" }])
      .mockResolvedValueOnce([invoiceRow({ amountEur: 97 })]);
    const svc = new SaasInvoiceService({ db: { query } });
    await svc.generateMonthlyInvoice("u1", "00000000-0000-0000-0000-0000000000aa", new Date("2026-05-01"), new Date("2026-05-31"));
    const params = query.mock.calls[2]?.[1] as unknown[];
    expect(params?.[5]).toBe(97);
  });

  it("saasInvoiceService singleton es instancia de SaasInvoiceService", () => {
    expect(saasInvoiceService).toBeInstanceOf(SaasInvoiceService);
  });
});
