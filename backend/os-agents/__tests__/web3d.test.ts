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
  resetAllWeb3dAgentsForTests,
  Web3dAnimacionAgent,
  Web3dAssetsAgent,
  Web3dConfigurador3dAgent,
  Web3dEstructuraAgent,
  Web3dRendimientoAgent,
  Web3dShadersAgent,
  Web3dTourVirtualAgent,
  Web3dWebxrAgent,
} from "../sectors/web3d";

const WEB3D_JSON = JSON.stringify({
  result: "Web3D elite: escena modular, WebXR opcional y export GLB versionado.",
  score: 90,
  recommendations: ["LOD por distancia", "KTX2 textures", "Session WebXR inline first"],
});

const web3dInput = {
  userId: "00000000-0000-0000-0000-000000003d01",
  businessName: "Estudio demo",
  services: ["Three.js", "WebXR"],
  targets: ["B2C", "mobile"],
};

describe("Web3d agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(WEB3D_JSON);
    resetAllWeb3dAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("Web3dEstructuraAgent", async () => {
    await assertOutput("web3d-estructura", () => Web3dEstructuraAgent.instance().run(web3dInput));
  });
  it("Web3dAnimacionAgent", async () => {
    await assertOutput("web3d-animacion", () => Web3dAnimacionAgent.instance().run(web3dInput));
  });
  it("Web3dConfigurador3dAgent", async () => {
    await assertOutput("web3d-configurador3d", () => Web3dConfigurador3dAgent.instance().run(web3dInput));
  });
  it("Web3dTourVirtualAgent", async () => {
    await assertOutput("web3d-tourvirtual", () => Web3dTourVirtualAgent.instance().run(web3dInput));
  });
  it("Web3dShadersAgent", async () => {
    await assertOutput("web3d-shaders", () => Web3dShadersAgent.instance().run(web3dInput));
  });
  it("Web3dRendimientoAgent", async () => {
    await assertOutput("web3d-rendimiento", () => Web3dRendimientoAgent.instance().run(web3dInput));
  });
  it("Web3dWebxrAgent", async () => {
    await assertOutput("web3d-webxr", () => Web3dWebxrAgent.instance().run(web3dInput));
  });
  it("Web3dAssetsAgent", async () => {
    await assertOutput("web3d-assets", () => Web3dAssetsAgent.instance().run(web3dInput));
  });
});
