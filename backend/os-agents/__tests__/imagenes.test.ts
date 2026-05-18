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
  ImagenesAbTestAgent,
  ImagenesAvatarAgent,
  ImagenesBannersAgent,
  ImagenesBrandKitAgent,
  ImagenesFormatsAgent,
  ImagenesProductoAgent,
  ImagenesPublicidadAgent,
  ImagenesSocialAgent,
  resetAllImagenesAgentsForTests,
} from "../sectors/imagenes";

const IMAGENES_JSON = JSON.stringify({
  result: "Imagenes OS: Flux Pro Ultra, banners multi-plataforma y texto separado.",
  score: 88,
  recommendations: ["Export doble imagen+texto", "Revisar 20% texto", "Lock brand kit"],
});

const imagenesInput = {
  userId: "00000000-0000-0000-0000-00000000ig01",
  businessName: "Negocio demo",
  services: ["Flux Pro Ultra", "Figma"],
  targets: ["Meta", "TikTok"],
  metadata: { program: "imagenes_v1" },
};

describe("Imagenes agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(IMAGENES_JSON);
    resetAllImagenesAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("ImagenesBannersAgent", async () => {
    await assertOutput("imagenes-banners", () => ImagenesBannersAgent.instance().run(imagenesInput));
  });
  it("ImagenesProductoAgent", async () => {
    await assertOutput("imagenes-producto", () => ImagenesProductoAgent.instance().run(imagenesInput));
  });
  it("ImagenesAvatarAgent", async () => {
    await assertOutput("imagenes-avatar", () => ImagenesAvatarAgent.instance().run(imagenesInput));
  });
  it("ImagenesAbTestAgent", async () => {
    await assertOutput("imagenes-abtest", () => ImagenesAbTestAgent.instance().run(imagenesInput));
  });
  it("ImagenesFormatsAgent", async () => {
    await assertOutput("imagenes-formats", () => ImagenesFormatsAgent.instance().run(imagenesInput));
  });
  it("ImagenesBrandKitAgent", async () => {
    await assertOutput("imagenes-brandkit", () => ImagenesBrandKitAgent.instance().run(imagenesInput));
  });
  it("ImagenesSocialAgent", async () => {
    await assertOutput("imagenes-social", () => ImagenesSocialAgent.instance().run(imagenesInput));
  });
  it("ImagenesPublicidadAgent", async () => {
    await assertOutput("imagenes-publicidad", () => ImagenesPublicidadAgent.instance().run(imagenesInput));
  });
});
