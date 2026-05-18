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
  SocialvideoAnalyticsAgent,
  SocialvideoCalendarioAgent,
  SocialvideoDistribucionAgent,
  SocialvideoEstrategiaAgent,
  SocialvideoGuionesAgent,
  SocialvideoProduccionAgent,
  SocialvideoSubtitulosAgent,
  SocialvideoTendenciasAgent,
  resetAllSocialvideoAgentsForTests,
} from "../sectors/socialvideo";

const SOCIALVIDEO_JSON = JSON.stringify({
  result: "Socialvideo OS: estrategia multi-plataforma con hooks, calendario y métricas de retención.",
  insights: ["Hook en 0-1s reduce swipe-away", "Repurpose vertical unifica coste por view"],
  recommendedActions: ["Plantilla brief producción", "Dashboard retención 3s/30s", "Protocolo tendencias semanal"],
});

const socialvideoInput = {
  userId: "00000000-0000-0000-0000-00000000sv01",
  businessContext: "B2B fintech: LinkedIn video + Shorts educativos; objetivo leads calificados sin estudio propio.",
  agentId: "socialvideo-estrategia",
};

describe("Socialvideo agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(SOCIALVIDEO_JSON);
    resetAllSocialvideoAgentsForTests();
  });

  async function assertOutput(runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { result: string; insights: string[]; recommendedActions: string[] };
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.insights.length).toBeGreaterThanOrEqual(1);
    expect(out.recommendedActions.length).toBeGreaterThanOrEqual(1);
  }

  it("SocialvideoEstrategiaAgent", async () => {
    await assertOutput(() => SocialvideoEstrategiaAgent.instance().execute(socialvideoInput));
  });
  it("SocialvideoGuionesAgent", async () => {
    await assertOutput(() => SocialvideoGuionesAgent.instance().execute(socialvideoInput));
  });
  it("SocialvideoCalendarioAgent", async () => {
    await assertOutput(() => SocialvideoCalendarioAgent.instance().execute(socialvideoInput));
  });
  it("SocialvideoTendenciasAgent", async () => {
    await assertOutput(() => SocialvideoTendenciasAgent.instance().execute(socialvideoInput));
  });
  it("SocialvideoProduccionAgent", async () => {
    await assertOutput(() => SocialvideoProduccionAgent.instance().execute(socialvideoInput));
  });
  it("SocialvideoSubtitulosAgent", async () => {
    await assertOutput(() => SocialvideoSubtitulosAgent.instance().execute(socialvideoInput));
  });
  it("SocialvideoDistribucionAgent", async () => {
    await assertOutput(() => SocialvideoDistribucionAgent.instance().execute(socialvideoInput));
  });
  it("SocialvideoAnalyticsAgent", async () => {
    await assertOutput(() => SocialvideoAnalyticsAgent.instance().execute(socialvideoInput));
  });
});
