import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

const completeMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({
      complete: completeMock,
    }),
  },
  LLM_DEFAULT_MAX_TOKENS: 4000,
  LLM_DEFAULT_MODEL: "gpt-4o",
}));

import {
  FiscalBillingDetectorAgent,
  FiscalBillingExemptAgent,
  FiscalBillingInvoiceAgent,
  FiscalBillingKitDigitalAgent,
  FiscalBillingReportAgent,
  FiscalBillingReverseChargeAgent,
  FiscalBillingVATAgent,
  FiscalBillingValidatorAgent,
  resetAllFiscalBillingAgentsForTests,
} from "../sectors/fiscalbilling";

const FB_JSON = JSON.stringify({
  content:
    "Factura ES: NIF, serie, base, IVA 21%, total. Reverse charge UE con ISP. Kit Digital: expediente.",
  score: 90,
  highlights: ["IVA 21% ES", "VAT DE validado", "Kit Digital"],
  metrics: ["Informe mensual por país"],
});

const fiscalBillingInput = {
  userId: "00000000-0000-0000-0000-00000000fb01",
  sector: "saas",
  brand: "Empresa Demo SL",
  countryCode: "ES" as const,
  taxId: "B12345678",
  isB2B: true,
  isEuCrossBorder: true,
  metricsBrief: "Suscripción Pro — reverse charge cliente DE",
};

type FiscalBillingOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("FiscalBilling agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(FB_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllFiscalBillingAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as FiscalBillingOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("FiscalBillingDetectorAgent", async () => {
    await assertOutput("fiscalbilling-detector", () => FiscalBillingDetectorAgent.instance.run(fiscalBillingInput));
  });

  it("FiscalBillingVATAgent", async () => {
    await assertOutput("fiscalbilling-vat", () => FiscalBillingVATAgent.instance.run(fiscalBillingInput));
  });

  it("FiscalBillingInvoiceAgent", async () => {
    await assertOutput("fiscalbilling-invoice", () => FiscalBillingInvoiceAgent.instance.run(fiscalBillingInput));
  });

  it("FiscalBillingKitDigitalAgent", async () => {
    await assertOutput("fiscalbilling-kit-digital", () => FiscalBillingKitDigitalAgent.instance.run(fiscalBillingInput));
  });

  it("FiscalBillingReverseChargeAgent", async () => {
    await assertOutput("fiscalbilling-reverse-charge", () => FiscalBillingReverseChargeAgent.instance.run(fiscalBillingInput));
  });

  it("FiscalBillingExemptAgent", async () => {
    await assertOutput("fiscalbilling-exempt", () => FiscalBillingExemptAgent.instance.run(fiscalBillingInput));
  });

  it("FiscalBillingReportAgent", async () => {
    await assertOutput("fiscalbilling-report", () => FiscalBillingReportAgent.instance.run(fiscalBillingInput));
  });

  it("FiscalBillingValidatorAgent", async () => {
    await assertOutput("fiscalbilling-validator", () => FiscalBillingValidatorAgent.instance.run(fiscalBillingInput));
  });
});
