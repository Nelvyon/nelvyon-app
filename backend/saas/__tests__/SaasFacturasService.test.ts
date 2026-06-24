import { describe, it, expect, vi } from "vitest";
import { SaasFacturasService } from "../SaasFacturasService";
import type { Factura } from "../SaasFacturasService";

type Row = Record<string, unknown>;

const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-facturas";

const baseFactura: Row = {
  id: "fac-1",
  tenantId: TENANT,
  contactId: null,
  invoiceNumber: "FAC-2026-00001",
  status: "draft",
  lineItems: [{ description: "Servicio SEO", quantity: 1, unitPrice: 500, total: 500 }],
  subtotal: 500,
  taxRate: 21,
  taxAmount: 105,
  total: 605,
  currency: "EUR",
  notes: null,
  dueDate: null,
  paidAt: null,
  createdAt: "2026-06-24T00:00:00.000Z",
};

describe("SaasFacturasService — list", () => {
  it("returns empty array when no invoices", async () => {
    const db = makeDb([[]]);
    const svc = new SaasFacturasService({ db });
    const result = await svc.list(TENANT);
    expect(result).toEqual([]);
  });

  it("maps DB row correctly", async () => {
    const db = makeDb([[baseFactura]]);
    const svc = new SaasFacturasService({ db });
    const [f] = await svc.list(TENANT);
    expect(f.invoiceNumber).toBe("FAC-2026-00001");
    expect(f.subtotal).toBe(500);
    expect(f.taxAmount).toBe(105);
    expect(f.total).toBe(605);
    expect(f.currency).toBe("EUR");
  });

  it("passes status filter to query", async () => {
    const db = makeDb([[baseFactura]]);
    const svc = new SaasFacturasService({ db });
    await svc.list(TENANT, "paid");
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain("status = $2");
  });
});

describe("SaasFacturasService — get", () => {
  it("returns null when not found", async () => {
    const db = makeDb([[]]);
    const svc = new SaasFacturasService({ db });
    expect(await svc.get(TENANT, "nope")).toBeNull();
  });

  it("returns factura by id", async () => {
    const db = makeDb([[baseFactura]]);
    const svc = new SaasFacturasService({ db });
    const f = await svc.get(TENANT, "fac-1");
    expect(f?.id).toBe("fac-1");
  });
});

describe("SaasFacturasService — create", () => {
  it("throws VALIDATION when no line items", async () => {
    const db = makeDb();
    const svc = new SaasFacturasService({ db });
    await expect(svc.create(TENANT, { lineItems: [] })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("auto-generates invoice number and calculates totals", async () => {
    const countRow = [{ count: "0" }];
    const db = makeDb([countRow, [baseFactura]]);
    const svc = new SaasFacturasService({ db });
    const f = await svc.create(TENANT, {
      lineItems: [{ description: "SEO", quantity: 1, unitPrice: 500, total: 500 }],
      taxRate: 21,
    });
    const insertCall = db.query.mock.calls[1];
    const sql = String(insertCall[0]);
    expect(sql).toContain("INSERT INTO invoices");
    // subtotal=500, tax=21% → taxAmount=105, total=605
    const params = insertCall[1] as unknown[];
    expect(params[4]).toBe(500); // subtotal
    expect(params[6]).toBe(105); // taxAmount
    expect(params[7]).toBe(605); // total
  });
});

describe("SaasFacturasService — update", () => {
  it("returns null when factura not found", async () => {
    const db = makeDb([[], []]);
    const svc = new SaasFacturasService({ db });
    expect(await svc.update(TENANT, "no-id", { status: "paid" })).toBeNull();
  });

  it("updates status to paid", async () => {
    const paidRow = { ...baseFactura, status: "paid", paidAt: "2026-06-24T10:00:00.000Z" };
    const db = makeDb([[baseFactura], [paidRow]]);
    const svc = new SaasFacturasService({ db });
    const f = await svc.update(TENANT, "fac-1", { status: "paid", paidAt: "2026-06-24T10:00:00.000Z" });
    expect(f?.status).toBe("paid");
    expect(f?.paidAt).toBeTruthy();
  });
});

describe("SaasFacturasService — delete", () => {
  it("returns false when not found or not draft", async () => {
    const db = makeDb([[]]);
    const svc = new SaasFacturasService({ db });
    expect(await svc.delete(TENANT, "no-id")).toBe(false);
  });

  it("returns true when deleted", async () => {
    const db = makeDb([[{ id: "fac-1" }]]);
    const svc = new SaasFacturasService({ db });
    expect(await svc.delete(TENANT, "fac-1")).toBe(true);
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain("status = 'draft'");
  });
});

describe("SaasFacturasService — getStats", () => {
  it("aggregates counts and amounts by status", async () => {
    const db = makeDb([[
      { status: "paid", count: "3", totalAmount: "1815" },
      { status: "draft", count: "2", totalAmount: "1210" },
      { status: "overdue", count: "1", totalAmount: "605" },
    ]]);
    const svc = new SaasFacturasService({ db });
    const stats = await svc.getStats(TENANT);
    expect(stats.total).toBe(6);
    expect(stats.paid).toBe(3);
    expect(stats.totalRevenue).toBe(1815);
    expect(stats.pending).toBe(2);
    expect(stats.overdue).toBe(1);
    expect(stats.pendingRevenue).toBeCloseTo(1815, 0); // 1210 + 605
  });
});

describe("SaasFacturasService — generatePdfHtml", () => {
  it("returns HTML containing invoice number", async () => {
    const svc = new SaasFacturasService();
    const html = svc.generatePdfHtml(baseFactura as unknown as Factura, "TestAgency");
    expect(html).toContain("FAC-2026-00001");
    expect(html).toContain("TestAgency");
    expect(html).toContain("FACTURA");
    expect(html).toContain("window.print()");
  });

  it("includes IVA and total", () => {
    const svc = new SaasFacturasService();
    const html = svc.generatePdfHtml(baseFactura as unknown as Factura);
    expect(html).toContain("21%");
    expect(html).toContain("605.00 EUR");
  });
});
