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
  BadgesAchievementCopyAgent,
  BadgesCertificationPathAgent,
  BadgesEmailCelebrationAgent,
  BadgesLeaderboardAgent,
  BadgesMilestoneTrackerAgent,
  BadgesRetentionTriggerAgent,
  BadgesShareableContentAgent,
  BadgesSystemDesignerAgent,
  resetAllBadgesAgentsForTests,
} from "../sectors/badges";

const BADGES_JSON = JSON.stringify({
  content: "ACHIEVE: Aspire, Challenge, Hook, Inspire, Engage, Victory, Evolve aplicado.",
  score: 89,
  badges: ["Pionero D7", "Maestro del flujo", "Embajador nivel oro"],
  milestones: ["7 sesiones", "Primer share", "Certificación básica"],
});

const badgesInput = {
  userId: "00000000-0000-0000-0000-0000000077aa",
  sector: "edtech",
  productName: "LearnHub",
  currentLevel: "avanzado",
  userActivity: { lessons_completed: "24", streak: "5" },
};

describe("Badges agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(BADGES_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllBadgesAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertBadgesOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      badges: string[];
      milestones: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.badges.length).toBeGreaterThanOrEqual(1);
    expect(out.milestones.length).toBeGreaterThanOrEqual(1);
  }

  it("BadgesSystemDesignerAgent", async () => {
    await assertBadgesOutput("badges-system-designer", () => BadgesSystemDesignerAgent.instance.run(badgesInput));
  });

  it("BadgesAchievementCopyAgent", async () => {
    await assertBadgesOutput("badges-achievement-copy", () => BadgesAchievementCopyAgent.instance.run(badgesInput));
  });

  it("BadgesMilestoneTrackerAgent", async () => {
    await assertBadgesOutput("badges-milestone-tracker", () => BadgesMilestoneTrackerAgent.instance.run(badgesInput));
  });

  it("BadgesCertificationPathAgent", async () => {
    await assertBadgesOutput("badges-certification-path", () => BadgesCertificationPathAgent.instance.run(badgesInput));
  });

  it("BadgesShareableContentAgent", async () => {
    await assertBadgesOutput("badges-shareable-content", () => BadgesShareableContentAgent.instance.run(badgesInput));
  });

  it("BadgesLeaderboardAgent", async () => {
    await assertBadgesOutput("badges-leaderboard", () => BadgesLeaderboardAgent.instance.run(badgesInput));
  });

  it("BadgesEmailCelebrationAgent", async () => {
    await assertBadgesOutput("badges-email-celebration", () => BadgesEmailCelebrationAgent.instance.run(badgesInput));
  });

  it("BadgesRetentionTriggerAgent", async () => {
    await assertBadgesOutput("badges-retention-trigger", () => BadgesRetentionTriggerAgent.instance.run(badgesInput));
  });
});
