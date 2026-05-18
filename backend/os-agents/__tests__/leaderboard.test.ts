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
  LeaderboardBadgeAgent,
  LeaderboardChallengeAgent,
  LeaderboardNotifierAgent,
  LeaderboardPublicPageAgent,
  LeaderboardRankingAgent,
  LeaderboardRewardAgent,
  LeaderboardSnapshotAgent,
  LeaderboardViralAgent,
  resetAllLeaderboardAgentsForTests,
} from "../sectors/leaderboard";

const LB_JSON = JSON.stringify({
  content: "Leaderboard: score por agentes OS + tenure + referidos; snapshot lunes UTC.",
  score: 90,
  highlights: ["Top 3 global mes gratis", "Elite sector top 1%"],
  metrics: ["Posición 7 en retail", "Semana 2026-W19"],
});

const leaderboardInput = {
  userId: "00000000-0000-0000-0000-00000000lb01",
  sector: "retail",
  brand: "TiendaDemo",
  scope: "sector" as const,
  optInPublic: true,
  week: "2026-W19",
  metricsBrief: "500 outputs OS generados",
};

type LeaderboardOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Leaderboard agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(LB_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllLeaderboardAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as LeaderboardOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("LeaderboardRankingAgent", async () => {
    await assertOutput("leaderboard-ranking", () => LeaderboardRankingAgent.instance.run(leaderboardInput));
  });

  it("LeaderboardBadgeAgent", async () => {
    await assertOutput("leaderboard-badge", () => LeaderboardBadgeAgent.instance.run(leaderboardInput));
  });

  it("LeaderboardNotifierAgent", async () => {
    await assertOutput("leaderboard-notifier", () => LeaderboardNotifierAgent.instance.run(leaderboardInput));
  });

  it("LeaderboardPublicPageAgent", async () => {
    await assertOutput("leaderboard-public-page", () => LeaderboardPublicPageAgent.instance.run(leaderboardInput));
  });

  it("LeaderboardChallengeAgent", async () => {
    await assertOutput("leaderboard-challenge", () => LeaderboardChallengeAgent.instance.run(leaderboardInput));
  });

  it("LeaderboardRewardAgent", async () => {
    await assertOutput("leaderboard-reward", () => LeaderboardRewardAgent.instance.run(leaderboardInput));
  });

  it("LeaderboardSnapshotAgent", async () => {
    await assertOutput("leaderboard-snapshot", () => LeaderboardSnapshotAgent.instance.run(leaderboardInput));
  });

  it("LeaderboardViralAgent", async () => {
    await assertOutput("leaderboard-viral", () => LeaderboardViralAgent.instance.run(leaderboardInput));
  });
});
