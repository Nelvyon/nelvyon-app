// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const dbMock = { query: queryMock };

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => dbMock,
  },
}));

const llmMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({ complete: llmMock }),
  },
}));

import {
  BrandingArquitecturaAgent,
  BrandingAuditAgent,
  BrandingGuiaAgent,
  BrandingIdentidadAgent,
  BrandingLogoAgent,
  BrandingNamingAgent,
  BrandingPosicionamientoAgent,
  BrandingVoiceAgent,
  resetAllBrandingAgentsForTests,
} from "../sectors/branding";

const BRANDING_JSON = JSON.stringify({
  result: "Branding OS: identidad, logo concept, brandbook, naming, posicionamiento y voz multicanal.",
  score: 90,
  recommendations: ["Legal review naming", "WCAG contraste", "Versionado brandbook"],
});

const brandingInput = {
  userId: "00000000-0000-0000-0000-00000000br01",
  businessName: "Marca demo",
  services: ["SaaS", "B2B"],
  targets: ["EU"],
  metadata: { program: "branding_v1" },
};

describe("Branding agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(BRANDING_JSON);
    resetAllBrandingAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("BrandingIdentidadAgent", async () => {
    await assertOutput("branding-identidad", () => BrandingIdentidadAgent.instance().run(brandingInput));
  });
  it("BrandingLogoAgent", async () => {
    await assertOutput("branding-logo", () => BrandingLogoAgent.instance().run(brandingInput));
  });
  it("BrandingGuiaAgent", async () => {
    await assertOutput("branding-guia", () => BrandingGuiaAgent.instance().run(brandingInput));
  });
  it("BrandingNamingAgent", async () => {
    await assertOutput("branding-naming", () => BrandingNamingAgent.instance().run(brandingInput));
  });
  it("BrandingPosicionamientoAgent", async () => {
    await assertOutput("branding-posicionamiento", () => BrandingPosicionamientoAgent.instance().run(brandingInput));
  });
  it("BrandingArquitecturaAgent", async () => {
    await assertOutput("branding-arquitectura", () => BrandingArquitecturaAgent.instance().run(brandingInput));
  });
  it("BrandingVoiceAgent", async () => {
    await assertOutput("branding-voice", () => BrandingVoiceAgent.instance().run(brandingInput));
  });
  it("BrandingAuditAgent", async () => {
    await assertOutput("branding-audit", () => BrandingAuditAgent.instance().run(brandingInput));
  });
});
