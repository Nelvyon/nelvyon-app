// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DigitalContractsService, resetDigitalContractsServiceForTests } from "../DigitalContractsService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const CONTRACT_ID = "00000000-0000-0000-0000-0000000000bb";

const INPUT = {
  clientName: "Cliente X",
  clientEmail: "cliente@example.com",
  serviceType: "SEO Premium",
  price: 1200,
  currency: "EUR",
  duration: "12 months",
  terms: ["Pago mensual", "Confidencialidad"],
  startDate: "2026-06-01",
};

describe("DigitalContractsService", () => {
  beforeEach(() => {
    resetDigitalContractsServiceForTests();
    vi.clearAllMocks();
  });

  it("generateContract", async () => {
    const llm = { complete: vi.fn().mockResolvedValue(`{"contractText":"Contrato","summary":"Resumen","keyTerms":["Pago","Soporte"]}`) };
    const svc = new DigitalContractsService({ db: { query: vi.fn() }, llm });
    const out = await svc.generateContract(USER_ID, INPUT);
    expect(out.contractText).toContain("Contrato");
    expect(out.keyTerms).toHaveLength(2);
  });

  it("createContract", async () => {
    const llm = { complete: vi.fn().mockResolvedValue(`{"contractText":"Contrato","summary":"Resumen","keyTerms":["Pago"]}`) };
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: CONTRACT_ID,
        user_id: USER_ID,
        client_name: INPUT.clientName,
        client_email: INPUT.clientEmail,
        service_type: INPUT.serviceType,
        price: "1200",
        currency: "EUR",
        input: INPUT,
        contract_text: "Contrato",
        summary: "Resumen",
        key_terms: ["Pago"],
        status: "draft",
        sign_token: null,
        sent_at: null,
        signed_at: null,
        signature_data: null,
        voided_at: null,
        created_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new DigitalContractsService({ db: { query }, llm });
    const out = await svc.createContract(USER_ID, INPUT);
    expect(out.status).toBe("draft");
  });

  it("sendForSignature", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ id: CONTRACT_ID, status: "sent" }]);
    const svc = new DigitalContractsService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.sendForSignature(CONTRACT_ID, USER_ID);
    expect(out.status).toBe("sent");
    expect(out.token).toBeTruthy();
  });

  it("signContract", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ id: CONTRACT_ID, status: "signed" }]);
    const svc = new DigitalContractsService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.signContract("token-abc", "base64signature");
    expect(out.status).toBe("signed");
  });

  it("voidContract", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ id: CONTRACT_ID, status: "voided" }]);
    const svc = new DigitalContractsService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.voidContract(CONTRACT_ID, USER_ID);
    expect(out.status).toBe("voided");
  });

  it("getContracts", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: CONTRACT_ID,
        user_id: USER_ID,
        client_name: INPUT.clientName,
        client_email: INPUT.clientEmail,
        service_type: INPUT.serviceType,
        price: "1200",
        currency: "EUR",
        input: INPUT,
        contract_text: "Contrato",
        summary: "Resumen",
        key_terms: ["Pago"],
        status: "draft",
        sign_token: null,
        sent_at: null,
        signed_at: null,
        signature_data: null,
        voided_at: null,
        created_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new DigitalContractsService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getContracts(USER_ID, { status: "draft" });
    expect(out).toHaveLength(1);
  });

  it("getContract", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: CONTRACT_ID,
        user_id: USER_ID,
        client_name: INPUT.clientName,
        client_email: INPUT.clientEmail,
        service_type: INPUT.serviceType,
        price: "1200",
        currency: "EUR",
        input: INPUT,
        contract_text: "Contrato",
        summary: "Resumen",
        key_terms: ["Pago"],
        status: "draft",
        sign_token: null,
        sent_at: null,
        signed_at: null,
        signature_data: null,
        voided_at: null,
        created_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new DigitalContractsService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getContract(CONTRACT_ID, USER_ID);
    expect(out?.id).toBe(CONTRACT_ID);
  });
});
