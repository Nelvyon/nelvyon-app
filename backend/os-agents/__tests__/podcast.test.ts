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
  PodcastAnalyticsAgent,
  PodcastAudiogramaAgent,
  PodcastDistribucionAgent,
  PodcastEdicionAgent,
  PodcastGuionAgent,
  PodcastMusicaAgent,
  PodcastTranscripcionAgent,
  PodcastVozAgent,
  resetAllPodcastAgentsForTests,
} from "../sectors/podcast";

const PODCAST_JSON = JSON.stringify({
  result: "Podcast OS: guión capítulos, RSS triple plataforma y audiograma 60s.",
  score: 90,
  recommendations: ["Chapters ID3", "LUFS -16", "Audiogram safe zone"],
});

const podcastInput = {
  userId: "00000000-0000-0000-0000-00000000pc01",
  businessName: "Show demo",
  services: ["Whisper", "ElevenLabs"],
  targets: ["Spotify", "B2B"],
};

describe("Podcast agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(PODCAST_JSON);
    resetAllPodcastAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("PodcastGuionAgent", async () => {
    await assertOutput("podcast-guion", () => PodcastGuionAgent.instance().run(podcastInput));
  });
  it("PodcastVozAgent", async () => {
    await assertOutput("podcast-voz", () => PodcastVozAgent.instance().run(podcastInput));
  });
  it("PodcastMusicaAgent", async () => {
    await assertOutput("podcast-musica", () => PodcastMusicaAgent.instance().run(podcastInput));
  });
  it("PodcastEdicionAgent", async () => {
    await assertOutput("podcast-edicion", () => PodcastEdicionAgent.instance().run(podcastInput));
  });
  it("PodcastTranscripcionAgent", async () => {
    await assertOutput("podcast-transcripcion", () => PodcastTranscripcionAgent.instance().run(podcastInput));
  });
  it("PodcastDistribucionAgent", async () => {
    await assertOutput("podcast-distribucion", () => PodcastDistribucionAgent.instance().run(podcastInput));
  });
  it("PodcastAudiogramaAgent", async () => {
    await assertOutput("podcast-audiograma", () => PodcastAudiogramaAgent.instance().run(podcastInput));
  });
  it("PodcastAnalyticsAgent", async () => {
    await assertOutput("podcast-analytics", () => PodcastAnalyticsAgent.instance().run(podcastInput));
  });
});
