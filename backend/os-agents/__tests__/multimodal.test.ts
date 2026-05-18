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
  MultimodalAudioAgent,
  MultimodalCreativasAgent,
  MultimodalDocumentosAgent,
  MultimodalExtraccionAgent,
  MultimodalSintesisAgent,
  MultimodalTextoImagenAgent,
  MultimodalTraduccionAgent,
  MultimodalVideoAgent,
  resetAllMultimodalAgentsForTests,
} from "../sectors/multimodal";

const MULTIMODAL_JSON = JSON.stringify({
  result: "Multimodal OS: texto+imagen, audio, vídeo y extracción con trazabilidad y PII.",
  score: 87,
  recommendations: ["Revisar consentimiento medios", "Versión solo texto", "Log fuentes"],
});

const multimodalInput = {
  userId: "00000000-0000-0000-0000-00000000mm01",
  businessName: "Negocio demo",
  services: ["DAM", "Transcripción batch"],
  targets: ["LATAM", "WCAG AA"],
  metadata: { program: "multimodal_v1" },
};

describe("Multimodal agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(MULTIMODAL_JSON);
    resetAllMultimodalAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("MultimodalTextoImagenAgent", async () => {
    await assertOutput("multimodal-texto-imagen", () => MultimodalTextoImagenAgent.instance().run(multimodalInput));
  });
  it("MultimodalAudioAgent", async () => {
    await assertOutput("multimodal-audio", () => MultimodalAudioAgent.instance().run(multimodalInput));
  });
  it("MultimodalVideoAgent", async () => {
    await assertOutput("multimodal-video", () => MultimodalVideoAgent.instance().run(multimodalInput));
  });
  it("MultimodalDocumentosAgent", async () => {
    await assertOutput("multimodal-documentos", () => MultimodalDocumentosAgent.instance().run(multimodalInput));
  });
  it("MultimodalExtraccionAgent", async () => {
    await assertOutput("multimodal-extraccion", () => MultimodalExtraccionAgent.instance().run(multimodalInput));
  });
  it("MultimodalTraduccionAgent", async () => {
    await assertOutput("multimodal-traduccion", () => MultimodalTraduccionAgent.instance().run(multimodalInput));
  });
  it("MultimodalCreativasAgent", async () => {
    await assertOutput("multimodal-creativas", () => MultimodalCreativasAgent.instance().run(multimodalInput));
  });
  it("MultimodalSintesisAgent", async () => {
    await assertOutput("multimodal-sintesis", () => MultimodalSintesisAgent.instance().run(multimodalInput));
  });
});
