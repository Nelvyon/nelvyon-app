// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getMediaAudienceGrowthAgent,
  getMediaContentCalendarAgent,
  getMediaEmailSequenceAgent,
  getMediaMonetizationAgent,
  getMediaNewsletterWriterAgent,
  getMediaPodcastScriptAgent,
  getMediaSeoArticlesAgent,
  getMediaSponsorPitchAgent,
  getMediaViralHooksAgent,
  resetMediaAudienceGrowthAgentForTests,
  resetMediaContentCalendarAgentForTests,
  resetMediaEmailSequenceAgentForTests,
  resetMediaMonetizationAgentForTests,
  resetMediaNewsletterWriterAgentForTests,
  resetMediaPodcastScriptAgentForTests,
  resetMediaSeoArticlesAgentForTests,
  resetMediaSponsorPitchAgentForTests,
  resetMediaViralHooksAgentForTests,
} from "../sectors/media";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Media agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetMediaNewsletterWriterAgentForTests();
    resetMediaAudienceGrowthAgentForTests();
    resetMediaMonetizationAgentForTests();
    resetMediaContentCalendarAgentForTests();
    resetMediaSponsorPitchAgentForTests();
    resetMediaSeoArticlesAgentForTests();
    resetMediaPodcastScriptAgentForTests();
    resetMediaViralHooksAgentForTests();
    resetMediaEmailSequenceAgentForTests();
  });

  const input = {
    niche: "tecnología y productividad",
    topic: "Cómo escalar una newsletter indie en 2026",
    format: "newsletter",
    tone: "profesional",
    audienceSize: 12000,
  };

  it("MediaNewsletterWriterAgent", async () => {
    const r = await getMediaNewsletterWriterAgent().run("u", input);
    expect(r.agentId).toBe("media-newsletter-writer");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("MediaAudienceGrowthAgent", async () => {
    const r = await getMediaAudienceGrowthAgent().run("u", input);
    expect(r.agentId).toBe("media-audience-growth");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("MediaMonetizationAgent", async () => {
    const r = await getMediaMonetizationAgent().run("u", input);
    expect(r.agentId).toBe("media-monetization");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("MediaContentCalendarAgent", async () => {
    const r = await getMediaContentCalendarAgent().run("u", input);
    expect(r.agentId).toBe("media-content-calendar");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("MediaSponsorPitchAgent", async () => {
    const r = await getMediaSponsorPitchAgent().run("u", input);
    expect(r.agentId).toBe("media-sponsor-pitch");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("MediaSeoArticlesAgent", async () => {
    const r = await getMediaSeoArticlesAgent().run("u", input);
    expect(r.agentId).toBe("media-seo-articles");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("MediaPodcastScriptAgent", async () => {
    const r = await getMediaPodcastScriptAgent().run("u", input);
    expect(r.agentId).toBe("media-podcast-script");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("MediaViralHooksAgent", async () => {
    const r = await getMediaViralHooksAgent().run("u", input);
    expect(r.agentId).toBe("media-viral-hooks");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("MediaEmailSequenceAgent", async () => {
    const r = await getMediaEmailSequenceAgent().run("u", input);
    expect(r.agentId).toBe("media-email-sequence");
    expect(r.result.length).toBeGreaterThan(0);
  });
});
