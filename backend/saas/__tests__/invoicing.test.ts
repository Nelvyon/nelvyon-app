// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  InvoicingService,
  getInvoicingService,
  resetInvoicingServiceForTests,
} from "../InvoicingService";

const USER_ID = "00000000-0000-0000-0000-000000000011";

const ROW = {
  id: "11111111-1111-1111-1111-111111111111",
  user_id: USER_ID,
  invoice_number: "INV-2026-12345",
  client_name: "Acme",
  client_email: "billing@acme.com",
  client_address: "Calle 1",
  items: [
    {
      description: "Servicio",
      quantity: 2,
      unitPrice: 100,
      taxRate: 21,
      lineSubtotal: 200,
      lineTax: 42,
      lineTotal: 242,
    },
  ],
  subtotal: "200",
  tax_total: "42",
  total: "242",
  currency: "EUR",
  due_date: "2026-07-01",
  notes: "n",
  logo_url: null,
  status: "draft",
  payment_token: null,
  sent_at: null,
  paid_at: null,
  paid_method: null,
  voided_at: null,
  created_at: new Date("2026-06-01T00:00:00.000Z"),
  updated_at: new Date("2026-06-01T00:00:00.000Z"),
};

describe("InvoicingService", () => {
  beforeEach(() => {
    resetInvoicingServiceForTests();
    vi.clearAllMocks();
  });

  it("createInvoice calcula subtotal/impuestos/total", async () => {
    const query = vi.fn().mockResolvedValueOnce([ROW]);
    const s = new InvoicingService({ db: { query } });
    await s.createInvoice(USER_ID, {
      clientName: "Acme",
      clientEmail: "billing@acme.com",
      items: [{ description: "Servicio", quantity: 2, unitPrice: 100, taxRate: 21 }],
      currency: "EUR",
      dueDate: "2026-07-01",
    });
    const params = query.mock.calls[0][1];
    expect(params[6]).toBe(200);
    expect(params[7]).toBe(42);
    expect(params[8]).toBe(242);
  });

  it("generateInvoicePDF devuelve htmlContent", async () => {
    const query = vi.fn().mockResolvedValueOnce([ROW]);
    const complete = vi.fn().mockResolvedValue("<html><body>Factura</body></html>");
    const s = new InvoicingService({ db: { query }, llm: { complete } });
    const out = await s.generateInvoicePDF(ROW.id, USER_ID);
    expect(out.htmlContent).toContain("<html>");
  });

  it("sendInvoice actualiza estado y payment_token", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ ...ROW, status: "sent", payment_token: "tok" }]);
    const s = new InvoicingService({ db: { query } });
    const out = await s.sendInvoice(ROW.id, USER_ID);
    expect(out?.status).toBe("sent");
    expect(out?.paymentToken).toBeTruthy();
  });

  it("markPaid actualiza estado paid", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ ...ROW, status: "paid", paid_method: "card", paid_at: new Date() }]);
    const s = new InvoicingService({ db: { query } });
    const out = await s.markPaid(ROW.id, USER_ID, "card");
    expect(out?.status).toBe("paid");
    expect(out?.paidMethod).toBe("card");
  });

  it("sendReminder genera subject/body", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ ...ROW, status: "sent", due_date: "2026-01-01" }]);
    const complete = vi.fn().mockResolvedValue(
      JSON.stringify({
        subject: "Pago pendiente",
        body: "Tu factura está vencida.",
      }),
    );
    const s = new InvoicingService({ db: { query }, llm: { complete } });
    const out = await s.sendReminder(ROW.id, USER_ID);
    expect(out.subject).toContain("Pago");
    expect(out.body.length).toBeGreaterThan(0);
  });

  it("voidInvoice actualiza estado void", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ ...ROW, status: "void", voided_at: new Date() }]);
    const s = new InvoicingService({ db: { query } });
    const out = await s.voidInvoice(ROW.id, USER_ID);
    expect(out?.status).toBe("void");
  });

  it("getInvoices aplica filtros", async () => {
    const query = vi.fn().mockResolvedValueOnce([ROW]);
    const s = new InvoicingService({ db: { query } });
    const out = await s.getInvoices(USER_ID, { status: "draft", fromDate: "2026-01-01", toDate: "2026-12-31" });
    expect(out).toHaveLength(1);
    expect(String(query.mock.calls[0][0])).toContain("status = $2");
  });

  it("getStats calcula métricas", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ total_invoiced: "1000", paid: "700", pending: "300", overdue: "100" }])
      .mockResolvedValueOnce([{ avg_days: "8.5" }]);
    const s = new InvoicingService({ db: { query } });
    const st = await s.getStats(USER_ID);
    expect(st.totalInvoiced).toBe(1000);
    expect(st.averagePaymentDays).toBe(8.5);
  });

  it("singleton funciona y resetea", () => {
    const a = getInvoicingService();
    const b = getInvoicingService();
    expect(a).toBe(b);
    resetInvoicingServiceForTests();
    const c = getInvoicingService();
    expect(c).not.toBe(a);
  });
});
