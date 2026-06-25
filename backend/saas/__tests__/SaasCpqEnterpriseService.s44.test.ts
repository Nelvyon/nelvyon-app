/**
 * S44 — SaasCpqEnterpriseService unit tests
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SaasCpqEnterpriseService, SaasCpqEnterpriseError } from "../SaasCpqEnterpriseService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

// Stable SES send spy — needed for both success and failure tests
const mockSesSend = vi.fn().mockResolvedValue({});

vi.mock("../../email/sesClient", () => ({
  getSesClient: () => ({ send: mockSesSend }),
}));
vi.mock("@aws-sdk/client-ses", () => ({
  SendEmailCommand: class SendEmailCommand { constructor(public input: unknown) {} },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDb(responses: unknown[]): SaasPostgresPort {
  let call = 0;
  return {
    query: vi.fn().mockImplementation(async () => {
      const res = responses[call] ?? [];
      call++;
      return res;
    }),
  } as unknown as SaasPostgresPort;
}

const NOW = new Date().toISOString();

function makeContractRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1", tenant_id: "t1", quote_id: null, deal_id: null,
    contract_number: "CTR-2026-ABC123", title: "Contrato Servicio Pro",
    client_name: "Acme SL", client_email: "ceo@acme.com",
    currency: "EUR", amount: "1200.00", billing_interval: "month",
    status: "draft", signed_at: null, starts_at: null, ends_at: null,
    auto_renew: false, terms_html: null, signature_token: "tok123",
    created_at: NOW, updated_at: NOW,
    ...overrides,
  };
}

function makeQuoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1", title: "Presupuesto Pro", client_name: "Acme SL",
    client_email: "ceo@acme.com", currency: "EUR", total: "1200.00",
    status: "accepted",
    ...overrides,
  };
}

beforeEach(() => { vi.clearAllMocks(); });

// ── Contracts ─────────────────────────────────────────────────────────────────

describe("createContract", () => {
  it("inserts and returns contract", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[makeContractRow()]]));
    const c = await svc.createContract("t1", {
      title: "Contrato Servicio Pro", clientName: "Acme SL",
      clientEmail: "ceo@acme.com", amount: 1200,
    });
    expect(c.title).toBe("Contrato Servicio Pro");
    expect(c.amount).toBe(1200);
    expect(c.status).toBe("draft");
  });

  it("throws VALIDATION when title is empty", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[]]));
    await expect(svc.createContract("t1", { title: "", clientName: "X", clientEmail: "x@y.com", amount: 0 }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION when clientEmail is empty", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[]]));
    await expect(svc.createContract("t1", { title: "T", clientName: "X", clientEmail: "", amount: 0 }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("createContractFromQuote", () => {
  it("creates contract from accepted quote", async () => {
    const db = makeDb([
      [makeQuoteRow()],         // quote lookup
      [makeContractRow()],      // INSERT contract
    ]);
    const svc = new SaasCpqEnterpriseService(db);
    const c = await svc.createContractFromQuote("t1", "q1");
    expect(c.clientName).toBe("Acme SL");
    expect(c.amount).toBe(1200);
  });

  it("throws NOT_FOUND when quote not found", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[]]));
    await expect(svc.createContractFromQuote("t1", "bad"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws INVALID_STATUS when quote not accepted", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[makeQuoteRow({ status: "draft" })]]));
    await expect(svc.createContractFromQuote("t1", "q1"))
      .rejects.toMatchObject({ code: "INVALID_STATUS" });
  });
});

describe("getContractByToken", () => {
  it("returns contract by token", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[makeContractRow()]]));
    const c = await svc.getContractByToken("tok123");
    expect(c.signatureToken).toBe("tok123");
  });

  it("throws NOT_FOUND for unknown token", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[]]));
    await expect(svc.getContractByToken("bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("signContract", () => {
  it("marks contract as signed", async () => {
    const signed = makeContractRow({ status: "signed", signed_at: NOW });
    const svc = new SaasCpqEnterpriseService(makeDb([[signed]]));
    const c = await svc.signContract("tok123");
    expect(c.status).toBe("signed");
    expect(c.signedAt).toBeTruthy();
  });

  it("throws NOT_FOUND for invalid token", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[]]));
    await expect(svc.signContract("bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("cancelContract", () => {
  it("cancels contract", async () => {
    const db = { query: vi.fn().mockResolvedValue([{ id: "c1" }]) } as unknown as SaasPostgresPort;
    const svc = new SaasCpqEnterpriseService(db);
    await expect(svc.cancelContract("t1", "c1")).resolves.toBeUndefined();
  });

  it("throws NOT_FOUND when contract not found or already cancelled", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[]]));
    await expect(svc.cancelContract("t1", "bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("renewContract", () => {
  it("creates a renewal contract", async () => {
    const renewal = makeContractRow({ title: "Contrato Servicio Pro (renovación)" });
    const db = makeDb([
      [makeContractRow({ status: "signed" })], // getContract
      [renewal],                                // createContract INSERT
    ]);
    const svc = new SaasCpqEnterpriseService(db);
    const c = await svc.renewContract("t1", "c1");
    expect(c.title).toContain("renovación");
  });

  it("throws INVALID_STATUS for draft contract", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[makeContractRow({ status: "draft" })]]));
    await expect(svc.renewContract("t1", "c1")).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });
});

// ── Dunning ───────────────────────────────────────────────────────────────────

describe("scheduleDunning", () => {
  it("creates 3 dunning events at D+3, D+7, D+14", async () => {
    const makeEvent = (n: number) => ({
      id: `ev${n}`, tenant_id: "t1", invoice_id: "inv1", attempt_number: n,
      channel: "email", status: "pending",
      scheduled_at: new Date().toISOString(),
      sent_at: null, error_message: null, created_at: NOW,
    });
    const db = makeDb([[makeEvent(1)], [makeEvent(2)], [makeEvent(3)]]);
    const svc = new SaasCpqEnterpriseService(db);
    const events = await svc.scheduleDunning("t1", "inv1");
    expect(events).toHaveLength(3);
    expect(events[0].attemptNumber).toBe(1);
    expect(events[2].attemptNumber).toBe(3);
  });
});

describe("processDueDunning", () => {
  it("marks pending events as sent (SES mocked)", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([{
          id: "ev1", tenant_id: "t1", invoice_id: "inv1", attempt_number: 1,
          channel: "email", status: "pending",
          scheduled_at: new Date(Date.now() - 1000).toISOString(),
          sent_at: null, error_message: null, created_at: NOW,
          client_email: "ceo@acme.com", invoice_number: "F-001", total: "500.00",
        }])
        .mockResolvedValue([]), // UPDATE sent
    } as unknown as SaasPostgresPort;
    const svc = new SaasCpqEnterpriseService(db);
    const result = await svc.processDueDunning();
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("marks event as failed when SES throws", async () => {
    mockSesSend.mockRejectedValueOnce(new Error("SES error"));

    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([{
          id: "ev2", tenant_id: "t1", invoice_id: "inv1", attempt_number: 1,
          channel: "email", status: "pending",
          scheduled_at: new Date(Date.now() - 1000).toISOString(),
          sent_at: null, error_message: null, created_at: NOW,
          client_email: "ceo@acme.com", invoice_number: "F-002", total: "200.00",
        }])
        .mockResolvedValue([]),
    } as unknown as SaasPostgresPort;
    const svc = new SaasCpqEnterpriseService(db);
    const result = await svc.processDueDunning();
    expect(result.failed).toBe(1);
  });
});

// ── Multi-currency ────────────────────────────────────────────────────────────

describe("getExchangeRate", () => {
  it("returns 1:1 for same currency", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[]]));
    const r = await svc.getExchangeRate("EUR", "EUR");
    expect(r.rate).toBe(1);
  });

  it("returns cached rate from DB", async () => {
    const db = makeDb([[{ base_currency: "EUR", target_currency: "USD", rate: "1.08", fetched_at: NOW }]]);
    const svc = new SaasCpqEnterpriseService(db);
    const r = await svc.getExchangeRate("EUR", "USD");
    expect(r.rate).toBe(1.08);
  });

  it("falls back to 1:1 when no DB cache and no API key", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[]]));
    const r = await svc.getExchangeRate("EUR", "JPY");
    expect(r.rate).toBe(1);
    expect(r.baseCurrency).toBe("EUR");
    expect(r.targetCurrency).toBe("JPY");
  });
});

describe("convertQuoteCurrency", () => {
  it("converts quote total using cached rate", async () => {
    const db = makeDb([
      [{ currency: "EUR", total: "1000.00" }],
      [{ base_currency: "EUR", target_currency: "USD", rate: "1.08", fetched_at: NOW }],
    ]);
    const svc = new SaasCpqEnterpriseService(db);
    const result = await svc.convertQuoteCurrency("t1", "q1", "USD");
    expect(result.originalTotal).toBe(1000);
    expect(result.convertedTotal).toBe(1080);
    expect(result.rate).toBe(1.08);
  });

  it("throws NOT_FOUND when quote not found", async () => {
    const svc = new SaasCpqEnterpriseService(makeDb([[]]));
    await expect(svc.convertQuoteCurrency("t1", "bad", "USD"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
