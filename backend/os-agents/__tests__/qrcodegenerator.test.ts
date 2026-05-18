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
  QrCodeGeneratorBrandingAgent,
  QrCodeGeneratorBulkAgent,
  QrCodeGeneratorCampaignAgent,
  QrCodeGeneratorCreatorAgent,
  QrCodeGeneratorDynamicAgent,
  QrCodeGeneratorPrintAgent,
  QrCodeGeneratorReportAgent,
  QrCodeGeneratorTrackingAgent,
  resetAllQrCodeGeneratorAgentsForTests,
} from "../sectors/qrcodegenerator";

const QR_JSON = JSON.stringify({
  content:
    "QrCodeGenerator: QR <1s, dinámicos RT, bulk 10k <60s, branding <3s, analytics RT, SVG PNG PDF EPS.",
  score: 94,
  highlights: ["QR <1s", "Bulk 10k", "Branding <3s"],
  metrics: ["QR scan rate"],
});

const qrCodeGeneratorInput = {
  userId: "00000000-0000-0000-0000-00000000qr01",
  sector: "retail",
  brand: "Retail demo",
  qrBrief: "QR dinámicos · branding · bulk",
  metricsBrief: "Escaneos · conversiones",
};

type QrCodeGeneratorOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("QrCodeGenerator agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(QR_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllQrCodeGeneratorAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as QrCodeGeneratorOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("QrCodeGeneratorCreatorAgent", async () => {
    await assertOutput("qrcodegenerator-creator", () => QrCodeGeneratorCreatorAgent.instance.run(qrCodeGeneratorInput));
  });

  it("QrCodeGeneratorBrandingAgent", async () => {
    await assertOutput("qrcodegenerator-branding", () => QrCodeGeneratorBrandingAgent.instance.run(qrCodeGeneratorInput));
  });

  it("QrCodeGeneratorDynamicAgent", async () => {
    await assertOutput("qrcodegenerator-dynamic", () => QrCodeGeneratorDynamicAgent.instance.run(qrCodeGeneratorInput));
  });

  it("QrCodeGeneratorTrackingAgent", async () => {
    await assertOutput("qrcodegenerator-tracking", () => QrCodeGeneratorTrackingAgent.instance.run(qrCodeGeneratorInput));
  });

  it("QrCodeGeneratorCampaignAgent", async () => {
    await assertOutput("qrcodegenerator-campaign", () => QrCodeGeneratorCampaignAgent.instance.run(qrCodeGeneratorInput));
  });

  it("QrCodeGeneratorBulkAgent", async () => {
    await assertOutput("qrcodegenerator-bulk", () => QrCodeGeneratorBulkAgent.instance.run(qrCodeGeneratorInput));
  });

  it("QrCodeGeneratorPrintAgent", async () => {
    await assertOutput("qrcodegenerator-print", () => QrCodeGeneratorPrintAgent.instance.run(qrCodeGeneratorInput));
  });

  it("QrCodeGeneratorReportAgent", async () => {
    await assertOutput("qrcodegenerator-report", () => QrCodeGeneratorReportAgent.instance.run(qrCodeGeneratorInput));
  });
});
