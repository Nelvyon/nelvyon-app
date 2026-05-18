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
  resetAllVideoMarketingAgentsForTests,
  VideoMarketingDistribucionAgent,
  VideoMarketingFormatsAgent,
  VideoMarketingGeneracionAgent,
  VideoMarketingGuionAgent,
  VideoMarketingMusicaAgent,
  VideoMarketingPresentadorAgent,
  VideoMarketingThumbnailAgent,
  VideoMarketingVozAgent,
} from "../sectors/videomarketing";

const VM_JSON = JSON.stringify({
  result: "Video marketing OS: shotlist Runway+Kling, VO ElevenLabs y publish pack.",
  score: 90,
  recommendations: ["Whisper subs", "9:16 safe zone", "UTM en descripción"],
});

const videoMarketingInput = {
  userId: "00000000-0000-0000-0000-00000000vm01",
  businessName: "Marca demo",
  services: ["Runway", "HeyGen"],
  targets: ["YouTube", "TikTok"],
};

describe("VideoMarketing agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(VM_JSON);
    resetAllVideoMarketingAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("VideoMarketingGuionAgent", async () => {
    await assertOutput("videomarketing-guion", () => VideoMarketingGuionAgent.instance().run(videoMarketingInput));
  });
  it("VideoMarketingGeneracionAgent", async () => {
    await assertOutput("videomarketing-generacion", () => VideoMarketingGeneracionAgent.instance().run(videoMarketingInput));
  });
  it("VideoMarketingPresentadorAgent", async () => {
    await assertOutput("videomarketing-presentador", () => VideoMarketingPresentadorAgent.instance().run(videoMarketingInput));
  });
  it("VideoMarketingVozAgent", async () => {
    await assertOutput("videomarketing-voz", () => VideoMarketingVozAgent.instance().run(videoMarketingInput));
  });
  it("VideoMarketingMusicaAgent", async () => {
    await assertOutput("videomarketing-musica", () => VideoMarketingMusicaAgent.instance().run(videoMarketingInput));
  });
  it("VideoMarketingFormatsAgent", async () => {
    await assertOutput("videomarketing-formats", () => VideoMarketingFormatsAgent.instance().run(videoMarketingInput));
  });
  it("VideoMarketingThumbnailAgent", async () => {
    await assertOutput("videomarketing-thumbnail", () => VideoMarketingThumbnailAgent.instance().run(videoMarketingInput));
  });
  it("VideoMarketingDistribucionAgent", async () => {
    await assertOutput("videomarketing-distribucion", () => VideoMarketingDistribucionAgent.instance().run(videoMarketingInput));
  });
});
